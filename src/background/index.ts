import {
  DEFAULT_CONFIG,
  EMPTY_CONNECTION,
  STORAGE_KEYS,
  WIND_ORIGIN,
  compareWindEvents,
  normalizeStreamConfig,
  parseWindEvent,
  parseWindHistory,
  type BackgroundPush,
  type ConnectionState,
  type PanelCommand,
  type RuntimeSnapshot,
  type StreamConfig,
  type TradeTarget,
  type WindEvent,
} from '../shared/protocol';
import { buildTargetTradeUrl, hostForTradeUrl } from '../shared/trade-route';

const EVENT_LIMIT = 200;
const RELAY_HEARTBEAT_TIMEOUT_MS = 20_000;
const RELAY_CONNECT_TIMEOUT_MS = 15_000;
const RELAY_WATCHDOG_MS = 10_000;
const WIND_TAB_PATTERN = `${WIND_ORIGIN}/*`;

type RelaySocketState = 'waiting' | 'open' | 'closed' | 'error';

interface RelayStatus {
  socketState: RelaySocketState;
  lastHello: string | null;
  lastFrameAt: string | null;
}

type WindRelayMessage =
  | ({ type: 'wind-relay:ready' | 'wind-relay:heartbeat' } & RelayStatus)
  | { type: 'wind-relay:frame'; raw: string }
  | { type: 'wind-relay:history'; raw: string }
  | { type: 'wind-relay:history-error'; error: string }
  | {
      type: 'wind-relay:state';
      state: 'socket-open' | 'socket-close' | 'socket-error';
      code?: number;
      reason?: string;
    };

const DIAGNOSTIC_SAMPLE_FRAME = {
  type: 'event',
  event: {
    seq: 869902,
    platform: 'fomo',
    handle: 'ed_x0101',
    tweet_id: 'fomo:fh:diagnostic-sample',
    action: 'fomo_buy',
    ts: 1788166598000,
    payload: {
      platform: 'fomo',
      handle: 'ed_x0101',
      author_name: 'Ed_x0101',
      action: 'fomo_buy',
      content_text: '买入 玩偶兔子 ≈$300 · 473.6K @ $0.0006 · BNB',
      ca_info: [
        {
          chain: 'evm',
          address: '0xf090a835eccfa66f514344ffcb01b275ea997777',
          symbol: '玩偶兔子',
          resolved_chain: 'bsc',
        },
      ],
      extra: {
        fomo: {
          dir: 'BUY',
          usd: 299.9865,
          symbol: '玩偶兔子',
          ca: '0xf090a835eccfa66f514344ffcb01b275ea997777',
          chain: 'BNB',
          tx_url: 'https://bscscan.com/tx/diagnostic-sample',
          pos: { seq: 'add', pct: null, closed: false },
        },
      },
    },
  },
} as const;

let config: StreamConfig = DEFAULT_CONFIG;
let connection: ConnectionState = EMPTY_CONNECTION;
let events: WindEvent[] = [];
let relayTabId: number | null = null;
let relayStartedAt = 0;
let lastRelayHeartbeatAt = 0;
let manuallyDisconnected = false;
let relayEnsurePromise: Promise<void> | null = null;
let relayConnectTimer: ReturnType<typeof setTimeout> | null = null;
let relayWatchdogTimer: ReturnType<typeof setInterval> | null = null;
const panelPorts = new Set<chrome.runtime.Port>();

function broadcast(message: BackgroundPush): void {
  for (const port of panelPorts) {
    try {
      port.postMessage(message);
    } catch {
      panelPorts.delete(port);
    }
  }
}

function setConnection(next: ConnectionState): void {
  connection = next;
  broadcast({ type: 'connection', connection });
}

function patchConnection(patch: Partial<ConnectionState>): void {
  setConnection({ ...connection, ...patch });
}

function snapshot(): RuntimeSnapshot {
  return { config, connection, events };
}

function clearRelayTimers(): void {
  if (relayConnectTimer) clearTimeout(relayConnectTimer);
  if (relayWatchdogTimer) clearInterval(relayWatchdogTimer);
  relayConnectTimer = null;
  relayWatchdogTimer = null;
}

function persistEvents(): void {
  void chrome.storage.session.set({ [STORAGE_KEYS.events]: events });
}

function addEvent(event: WindEvent): void {
  events = [event, ...events.filter((item) => item.id !== event.id)]
    .sort(compareWindEvents)
    .slice(0, EVENT_LIMIT);
  persistEvents();
  patchConnection({
    phase: 'live',
    lastEventAt: event.receivedAt,
    message: '已收到听风实时事件',
  });
  broadcast({ type: 'event', event });
  broadcast({ type: 'snapshot', snapshot: snapshot() });
}

function applyHistory(raw: string): void {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    console.warn('[听风实时流] REST 历史响应不是有效 JSON');
    return;
  }

  console.log('[听风实时流] REST ← 收到历史快照', payload);
  const historical = parseWindHistory(payload);
  const byId = new Map(events.map((event) => [event.id, event]));
  for (const event of historical) byId.set(event.id, event);
  events = [...byId.values()].sort(compareWindEvents).slice(0, EVENT_LIMIT);
  persistEvents();
  patchConnection({
    message: historical.length
      ? `已加载 ${historical.length} 条听风历史事件，实时增量监听中`
      : '听风历史流为空，实时增量监听中',
  });
  console.info('[听风实时流] REST 历史加载完成', {
    parsed: historical.length,
    retained: events.length,
  });
  broadcast({ type: 'snapshot', snapshot: snapshot() });
}

function injectDiagnosticSample(): RuntimeSnapshot {
  const parsed = parseWindEvent(DIAGNOSTIC_SAMPLE_FRAME);
  if (!parsed) throw new Error('内置听风样本解析失败');
  const now = new Date().toISOString();
  addEvent({
    ...parsed,
    id: `demo:${Date.now()}`,
    occurredAt: now,
    receivedAt: now,
    title: `[演示] ${parsed.title}`,
  });
  console.info('[听风实时流] 已注入诊断演示卡片', { source: parsed.source });
  return snapshot();
}

function closeReason(code: number, reason: string): string {
  if (code === 4400) return '听风拒绝了页面登录会话（4400），请重新登录';
  if (code === 4429) return '听风限制了同时在线的 WebSocket 数量（4429）';
  if (code === 1006) return '听风页面的 WebSocket 意外断开（1006）';
  return reason || `听风页面的 WebSocket 已关闭（${code}）`;
}

function noteFrame(type: string): void {
  patchConnection({
    receivedMessages: connection.receivedMessages + 1,
    lastMessageType: type,
  });
}

function applyHello(message: Record<string, unknown>): void {
  const mode = typeof message.mode === 'string' ? message.mode : null;
  patchConnection({
    phase: 'live',
    mode,
    session:
      mode === 'user'
        ? 'authenticated'
        : mode === 'guest'
          ? 'guest'
          : connection.session,
    retryAt: null,
    lastCloseCode: null,
    message:
      mode === 'user'
        ? '已复用听风页面登录态，个人实时流接入成功'
        : mode === 'guest'
          ? '听风页面当前是游客实时流，请在该页面重新登录'
          : '已接入听风页面实时流',
  });
  console.info('[听风实时流] 页面 WebSocket 握手完成', {
    mode,
    watchCount:
      typeof message.watch_count === 'number' ? message.watch_count : null,
  });
}

function handleSocketMessage(raw: string, countFrame = true): void {
  let message: unknown;
  try {
    message = JSON.parse(raw);
  } catch {
    if (countFrame) noteFrame('non-json');
    return;
  }

  const record =
    typeof message === 'object' && message !== null
      ? (message as Record<string, unknown>)
      : null;
  const type = typeof record?.type === 'string' ? record.type : 'unknown';
  if (countFrame) noteFrame(type);

  if (type === 'hello_ok' && record) {
    applyHello(record);
    return;
  }

  if (type === 'pong' && typeof record?.t === 'number') {
    patchConnection({ latencyMs: Math.max(0, Date.now() - record.t) });
    return;
  }

  if (type !== 'event' && type !== 'event_update') return;

  patchConnection({ eventFrames: connection.eventFrames + 1 });
  try {
    const event = parseWindEvent(message);
    if (!event) {
      patchConnection({ droppedEvents: connection.droppedEvents + 1 });
      console.warn('[听风实时流] 事件帧未能解析', {
        type,
        eventKeys:
          record?.event && typeof record.event === 'object'
            ? Object.keys(record.event as Record<string, unknown>)
            : [],
      });
      return;
    }
    patchConnection({ parsedEvents: connection.parsedEvents + 1 });
    console.info('[听风实时流] 事件已解析并送入侧边栏', {
      id: event.id,
      source: event.source,
      action: event.action,
      position: event.position,
      hasToken: Boolean(event.token),
    });
    addEvent(event);
  } catch (error) {
    patchConnection({ droppedEvents: connection.droppedEvents + 1 });
    console.error('[听风实时流] 解析事件帧时发生异常', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function validRelayTab(sender: chrome.runtime.MessageSender): number | null {
  if (sender.id !== chrome.runtime.id || sender.frameId !== 0 || sender.tab?.id == null) {
    return null;
  }
  try {
    const senderUrl = sender.url ?? sender.tab.url;
    return senderUrl && new URL(senderUrl).origin === WIND_ORIGIN ? sender.tab.id : null;
  } catch {
    return null;
  }
}

function acceptRelaySender(sender: chrome.runtime.MessageSender): number | null {
  if (manuallyDisconnected) return null;
  const tabId = validRelayTab(sender);
  if (tabId == null) return null;
  if (relayTabId == null) relayTabId = tabId;
  return relayTabId === tabId ? tabId : null;
}

function applyRelayStatus(status: RelayStatus, tabId: number): void {
  relayTabId = tabId;
  lastRelayHeartbeatAt = Date.now();
  if (relayConnectTimer) clearTimeout(relayConnectTimer);
  relayConnectTimer = null;

  if (status.socketState === 'open') {
    patchConnection({
      phase: 'live',
      retryAt: null,
      lastCloseCode: null,
      message:
        connection.session === 'authenticated'
          ? '已复用听风页面登录态，个人实时流接入成功'
          : '已接入听风页面，正在确认登录态…',
    });
  } else if (status.socketState === 'error' || status.socketState === 'closed') {
    patchConnection({
      phase: 'reconnecting',
      message: '听风页面正在重连 WebSocket…',
    });
  }

  if (status.lastHello && connection.mode == null) {
    handleSocketMessage(status.lastHello, false);
  }
}

function isRelayStatus(value: unknown): value is RelayStatus {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    (record.socketState === 'waiting' ||
      record.socketState === 'open' ||
      record.socketState === 'closed' ||
      record.socketState === 'error') &&
    (record.lastHello === null || typeof record.lastHello === 'string') &&
    (record.lastFrameAt === null || typeof record.lastFrameAt === 'string')
  );
}

function isRelayMessage(value: unknown): value is WindRelayMessage {
  if (!value || typeof value !== 'object') return false;
  const type = (value as Record<string, unknown>).type;
  return typeof type === 'string' && type.startsWith('wind-relay:');
}

function handleRelayMessage(
  message: WindRelayMessage,
  sender: chrome.runtime.MessageSender,
): void {
  const tabId = acceptRelaySender(sender);
  if (tabId == null) return;
  lastRelayHeartbeatAt = Date.now();

  if (message.type === 'wind-relay:ready' || message.type === 'wind-relay:heartbeat') {
    applyRelayStatus(message, tabId);
    return;
  }

  if (message.type === 'wind-relay:frame') {
    console.log('[听风实时流] 页面 WS ↓ 收到原始消息', message.raw);
    handleSocketMessage(message.raw);
    return;
  }

  if (message.type === 'wind-relay:history') {
    applyHistory(message.raw);
    return;
  }

  if (message.type === 'wind-relay:history-error') {
    console.warn('[听风实时流] REST 历史加载失败，继续监听 WebSocket 增量', {
      error: message.error,
    });
    patchConnection({ message: '历史事件加载失败，WebSocket 实时增量仍在监听' });
    return;
  }

  if (message.type !== 'wind-relay:state') return;

  if (message.state === 'socket-open') {
    patchConnection({
      phase: 'live',
      retryAt: null,
      lastCloseCode: null,
      message: '已接入听风页面，正在确认登录态…',
    });
    return;
  }

  if (message.state === 'socket-close') {
    const code = typeof message.code === 'number' ? message.code : 0;
    patchConnection({
      phase: 'reconnecting',
      retryAt: null,
      lastCloseCode: code,
      message: closeReason(code, message.reason ?? ''),
    });
    console.warn('[听风实时流] 页面 WebSocket 已关闭', {
      code,
      reason: message.reason || null,
    });
    return;
  }

  patchConnection({
    phase: 'reconnecting',
    message: '听风页面 WebSocket 发生错误，等待页面自动重连…',
  });
}

function startConnectDeadline(): void {
  if (relayConnectTimer) clearTimeout(relayConnectTimer);
  relayConnectTimer = setTimeout(() => {
    if (manuallyDisconnected || lastRelayHeartbeatAt >= relayStartedAt) return;
    patchConnection({
      phase: 'error',
      session: 'unknown',
      message: '听风页面桥接未就绪，请刷新听风页面后重试',
    });
  }, RELAY_CONNECT_TIMEOUT_MS);
}

function chooseWindTab(tabs: chrome.tabs.Tab[]): chrome.tabs.Tab | undefined {
  return tabs
    .filter((tab) => tab.id != null)
    .sort((left, right) => {
      if (left.active !== right.active) return left.active ? -1 : 1;
      return (right.lastAccessed ?? 0) - (left.lastAccessed ?? 0);
    })[0];
}

async function ensureRelayPage(forceReload: boolean): Promise<void> {
  if (manuallyDisconnected) return;
  if (relayEnsurePromise) return relayEnsurePromise;

  relayEnsurePromise = (async () => {
    const tabs = await chrome.tabs.query({ url: WIND_TAB_PATTERN });
    const candidate = chooseWindTab(tabs);

    if (!candidate?.id) {
      const created = await chrome.tabs.create({ url: WIND_ORIGIN, active: false });
      relayTabId = created.id ?? null;
      patchConnection({ message: '已在后台打开听风页面，等待登录实时流…' });
      return;
    }

    relayTabId = candidate.id;
    if (!forceReload) {
      try {
        const response = (await chrome.tabs.sendMessage(candidate.id, {
          type: 'wind-relay:probe',
        })) as unknown;
        if (isRelayStatus(response)) {
          applyRelayStatus(response, candidate.id);
          return;
        }
      } catch {
        // An already-open page does not receive new manifest content scripts
        // until it reloads after the extension is installed or updated.
      }
    }

    await chrome.tabs.reload(candidate.id);
    patchConnection({ message: '正在刷新听风页面并接入已登录实时流…' });
  })()
    .catch((error: unknown) => {
      patchConnection({
        phase: 'error',
        session: 'unknown',
        message: error instanceof Error ? error.message : String(error),
      });
    })
    .finally(() => {
      relayEnsurePromise = null;
    });

  return relayEnsurePromise;
}

function startRelayWatchdog(): void {
  if (relayWatchdogTimer) clearInterval(relayWatchdogTimer);
  relayWatchdogTimer = setInterval(() => {
    if (
      manuallyDisconnected ||
      Date.now() - Math.max(lastRelayHeartbeatAt, relayStartedAt) <=
        RELAY_HEARTBEAT_TIMEOUT_MS
    ) {
      return;
    }
    relayTabId = null;
    relayStartedAt = Date.now();
    patchConnection({
      phase: 'reconnecting',
      session: 'checking',
      mode: null,
      message: '听风页面桥接心跳中断，正在恢复…',
    });
    startConnectDeadline();
    void ensureRelayPage(false);
  }, RELAY_WATCHDOG_MS);
}

async function connectStream(forceReload = false): Promise<void> {
  clearRelayTimers();
  manuallyDisconnected = false;
  relayStartedAt = Date.now();
  lastRelayHeartbeatAt = 0;
  if (forceReload) relayTabId = null;
  patchConnection({
    phase: 'connecting',
    session: 'checking',
    mode: null,
    retryAt: null,
    lastCloseCode: null,
    message: '正在接入听风页面的已登录实时流…',
  });
  startConnectDeadline();
  startRelayWatchdog();
  await ensureRelayPage(forceReload);
}

function disconnectStream(): void {
  manuallyDisconnected = true;
  clearRelayTimers();
  relayTabId = null;
  patchConnection({
    phase: 'offline',
    retryAt: null,
    message: '已手动暂停听风实时流转发',
  });
}

async function saveConfig(nextConfig: StreamConfig): Promise<RuntimeSnapshot> {
  const normalized = normalizeStreamConfig(nextConfig);
  const sampleToken = {
    chain: 'sol',
    address: 'TOKEN_ADDRESS',
    symbol: 'TOKEN',
  };
  buildTargetTradeUrl('debot', normalized.debotUrlTemplate, sampleToken);
  buildTargetTradeUrl('gmgn', normalized.gmgnUrlTemplate, sampleToken);
  config = normalized;
  await chrome.storage.local.set({ [STORAGE_KEYS.config]: config });
  broadcast({ type: 'snapshot', snapshot: snapshot() });
  return snapshot();
}

async function openTrade(
  target: TradeTarget,
  event: WindEvent,
): Promise<{ url: string; reused: boolean }> {
  if (!event.token) throw new Error('这条预警没有可交易的合约地址');
  const template = target === 'debot' ? config.debotUrlTemplate : config.gmgnUrlTemplate;
  const url = buildTargetTradeUrl(target, template, event.token);
  const host = hostForTradeUrl(url);

  if (config.reuseTradingTab) {
    const tabs = await chrome.tabs.query({});
    const candidate = tabs
      .filter((tab) => {
        try {
          return tab.url ? new URL(tab.url).host === host : false;
        } catch {
          return false;
        }
      })
      .sort((left, right) => (right.lastAccessed ?? 0) - (left.lastAccessed ?? 0))[0];

    if (candidate?.id != null) {
      await chrome.tabs.update(candidate.id, { url, active: true });
      if (candidate.windowId != null) {
        await chrome.windows.update(candidate.windowId, { focused: true });
      }
      return { url, reused: true };
    }
  }

  await chrome.tabs.create({ url, active: true });
  return { url, reused: false };
}

async function openWind(): Promise<{ opened: true }> {
  const tabs = await chrome.tabs.query({ url: WIND_TAB_PATTERN });
  const candidate = chooseWindTab(tabs);
  if (candidate?.id != null) {
    await chrome.tabs.update(candidate.id, { active: true });
    if (candidate.windowId != null) {
      await chrome.windows.update(candidate.windowId, { focused: true });
    }
  } else {
    await chrome.tabs.create({ url: WIND_ORIGIN, active: true });
  }
  return { opened: true };
}

async function hydrate(): Promise<void> {
  await Promise.allSettled([
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }),
    chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
  ]);
  const [local, session] = await Promise.all([
    chrome.storage.local.get(STORAGE_KEYS.config),
    chrome.storage.session.get(STORAGE_KEYS.events),
  ]);
  config = normalizeStreamConfig(local[STORAGE_KEYS.config]);
  if (Array.isArray(session[STORAGE_KEYS.events])) {
    events = session[STORAGE_KEYS.events]
      .map((item: unknown) => parseWindEvent(item))
      .filter((item: WindEvent | null): item is WindEvent => Boolean(item))
      .slice(0, EVENT_LIMIT);
  }
  await connectStream();
}

const ready = hydrate();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'wind-sidepanel') return;
  panelPorts.add(port);
  void ready.then(() =>
    port.postMessage({ type: 'snapshot', snapshot: snapshot() } satisfies BackgroundPush),
  );
  port.onDisconnect.addListener(() => panelPorts.delete(port));
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId !== relayTabId || manuallyDisconnected) return;
  relayTabId = null;
  relayStartedAt = Date.now();
  lastRelayHeartbeatAt = 0;
  patchConnection({
    phase: 'reconnecting',
    session: 'checking',
    mode: null,
    message: '听风页面已关闭，正在重新打开后台实时流页面…',
  });
  startConnectDeadline();
  void ensureRelayPage(false);
});

chrome.runtime.onMessage.addListener(
  (message: unknown, sender, sendResponse: (response: unknown) => void) => {
    if (isRelayMessage(message)) {
      handleRelayMessage(message, sender);
      return false;
    }

    const command = message as PanelCommand;
    void ready
      .then(async () => {
        switch (command.type) {
          case 'snapshot:get':
            return snapshot();
          case 'stream:connect':
            await connectStream(true);
            return snapshot();
          case 'stream:disconnect':
            disconnectStream();
            return snapshot();
          case 'config:save':
            return saveConfig(command.config);
          case 'demo:inject':
            return injectDiagnosticSample();
          case 'wind:open':
            return openWind();
          case 'trade:open':
            return openTrade(command.target, command.event);
          case 'events:clear':
            events = [];
            persistEvents();
            broadcast({ type: 'snapshot', snapshot: snapshot() });
            return snapshot();
          default:
            throw new Error('不支持的扩展命令');
        }
      })
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error: unknown) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    return true;
  },
);
