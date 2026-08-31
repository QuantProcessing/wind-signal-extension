(() => {
const BRIDGE_MARKER = '__wind_realtime_extension_bridge_v1__';
const WIND_WEBSOCKET_URL = 'wss://wind.jokkimon.club/ws';
const WIND_FEED_ACTIONS =
  'tweet,reply,quote,repost,delete_post,fomo_buy,fomo_sell,fomo_swap,fomo_thesis,fomo_consensus,fomo_cash,fomo_verified,binance_new,pump_callout,pump_update,pump_buy,pump_sell,ansem_tier,ansem_burn';
const HISTORY_TIMEOUT_MS = 20_000;

type BridgeMessage =
  | { kind: 'bridge-installed' }
  | { kind: 'socket-open' }
  | { kind: 'socket-close'; code: number; reason: string }
  | { kind: 'socket-error' }
  | { kind: 'frame'; raw: string }
  | { kind: 'history'; raw: string }
  | { kind: 'history-error'; error: string };

let historySettled = false;
const bufferedEventFrames: string[] = [];

function publish(message: BridgeMessage): void {
  window.postMessage(
    {
      [BRIDGE_MARKER]: true,
      ...message,
    },
    window.location.origin,
  );
}

function isWindSocket(url: unknown): boolean {
  try {
    return new URL(String(url), window.location.href).href === WIND_WEBSOCKET_URL;
  } catch {
    return false;
  }
}

function isIncrementalEvent(raw: string): boolean {
  try {
    const message = JSON.parse(raw) as { type?: unknown };
    return message?.type === 'event' || message?.type === 'event_update';
  } catch {
    return false;
  }
}

function publishRawFrame(raw: string): void {
  if (!historySettled && isIncrementalEvent(raw)) {
    bufferedEventFrames.push(raw);
    return;
  }
  publish({ kind: 'frame', raw });
}

function publishFrame(data: unknown): void {
  if (typeof data === 'string') {
    publishRawFrame(data);
    return;
  }

  if (data instanceof Blob) {
    void data.text().then(publishRawFrame);
    return;
  }

  if (data instanceof ArrayBuffer) {
    publishRawFrame(new TextDecoder().decode(data));
  }
}

function finishHistory(): void {
  historySettled = true;
  for (const raw of bufferedEventFrames.splice(0)) publish({ kind: 'frame', raw });
}

async function fetchHistoryJson(path: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), HISTORY_TIMEOUT_MS);
  try {
    const response = await window.fetch(path, {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function hydrateHistory(): Promise<void> {
  if (typeof window.fetch !== 'function') {
    finishHistory();
    return;
  }

  try {
    const query = new URLSearchParams({ actions: WIND_FEED_ACTIONS, limit: '200' });
    const [feed, activities] = await Promise.all([
      fetchHistoryJson(`/api/feed?${query.toString()}`),
      fetchHistoryJson('/api/activities?limit=60'),
    ]);
    publish({ kind: 'history', raw: JSON.stringify({ feed, activities }) });
  } catch (error) {
    publish({
      kind: 'history-error',
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    finishHistory();
  }
}

function observe(socket: WebSocket): void {
  socket.addEventListener('open', () => publish({ kind: 'socket-open' }));
  socket.addEventListener('message', (event) => publishFrame(event.data));
  socket.addEventListener('close', (event) =>
    publish({
      kind: 'socket-close',
      code: event.code,
      reason: event.reason,
    }),
  );
  socket.addEventListener('error', () => publish({ kind: 'socket-error' }));
}

const NativeWebSocket = window.WebSocket;
const BridgedWebSocket = new Proxy(NativeWebSocket, {
  construct(target, argumentsList) {
    const socket = Reflect.construct(target, argumentsList) as WebSocket;
    if (isWindSocket(argumentsList[0])) observe(socket);
    return socket;
  },
});

window.WebSocket = BridgedWebSocket;
publish({ kind: 'bridge-installed' });
void hydrateHistory();
})();

export {};
