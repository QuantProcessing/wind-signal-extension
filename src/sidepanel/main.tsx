import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/noto-sans-sc';
import {
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  Clipboard,
  Coins,
  ExternalLink,
  Monitor,
  Moon,
  Network,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sun,
  UsersRound,
  Zap,
} from 'lucide-react';
import {
  DEFAULT_CONFIG,
  EMPTY_CONNECTION,
  WIND_WEBSOCKET_URL,
  type BackgroundPush,
  type ConnectionPhase,
  type ConsensusRef,
  type RuntimeSnapshot,
  type SessionState,
  type StreamConfig,
  type ThemePreference,
  type TokenRef,
  type TradeTarget,
  type WindEvent,
  type WindSource,
} from '../shared/protocol';
import { operationPresentation } from '../shared/operation';
import './styles.css';

const isExtension = typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
const now = Date.now();

const DEMO_EVENTS: WindEvent[] = [
  {
    id: 'demo-consensus-1',
    sequence: 1842,
    source: 'fomo',
    action: 'fomo_consensus',
    occurredAt: new Date(now - 4_200).toISOString(),
    receivedAt: new Date(now - 3_940).toISOString(),
    author: '共识',
    authorHandle: 'consensus',
    title: '共识买入 $CINEMA',
    importance: 'high',
    token: {
      chain: 'robinhood',
      address: '0x9936403a9cc72cf306063e3496ea387428a3aecd',
      symbol: 'CINEMA',
    },
    consensus: {
      people: 8,
      windowMinutes: 30,
      totalUsd: 79_100,
      participants: [
        { label: 'smol_intern', usd: 20_000, platform: 'fomo' },
        { label: 'edwin999', usd: 13_600, platform: 'fomo' },
        { label: 'kyle', usd: 11_000, platform: 'pumpfun' },
        { label: 'catsuki', usd: 11_000, platform: 'fomo' },
        { label: 'NotARandomUser', usd: 6_428, platform: 'fomo' },
        { label: 'Small_DDD', usd: 5_983, platform: 'pumpfun' },
        { label: 'jeetdegods', usd: 5_686, platform: 'fomo' },
        { label: 'mantis_213', usd: 5_500, platform: 'fomo' },
      ],
    },
  },
  {
    id: 'demo-tg-2',
    sequence: 1841,
    source: 'telegram',
    action: 'tweet',
    occurredAt: new Date(now - 34_000).toISOString(),
    receivedAt: new Date(now - 33_480).toISOString(),
    author: 'Smart Money Radar',
    authorHandle: 'smartradar',
    title: '频道发布新合约地址',
    body: '首条消息已编辑一次，合约地址保持不变。',
    importance: 'high',
    token: {
      chain: 'base',
      address: '0x8bf3a40f026bb3f4f7d5f3d2demo',
      symbol: 'RADAR',
    },
  },
  {
    id: 'demo-pump-3',
    sequence: 1840,
    source: 'pump',
    action: 'pump_buy',
    occurredAt: new Date(now - 92_000).toISOString(),
    receivedAt: new Date(now - 91_820).toISOString(),
    author: 'Pump Trader',
    authorHandle: 'pumptrader',
    title: '$PULSE',
    body: '再次买入，成交分布于 2 个区块。',
    amountUsd: 5_000,
    importance: 'urgent',
    position: { sequence: 'add' },
    token: {
      chain: 'sol',
      address: '3Wd7M9rJvA4Kp2nQdL6sY8demo',
      symbol: 'PULSE',
    },
  },
  {
    id: 'demo-news-4',
    sequence: 1839,
    source: 'news',
    action: 'binance_new',
    occurredAt: new Date(now - 185_000).toISOString(),
    receivedAt: new Date(now - 184_400).toISOString(),
    author: '听风快讯',
    authorHandle: 'windnews',
    title: '交易所发布资产维护公告',
    body: '该消息没有可直接交易的合约地址。',
    importance: 'normal',
  },
];

const DEMO_SNAPSHOT: RuntimeSnapshot = {
  config: DEFAULT_CONFIG,
  connection: {
    phase: 'live',
    session: 'authenticated',
    mode: 'user',
    latencyMs: 42,
    lastEventAt: DEMO_EVENTS[0].receivedAt,
    retryAt: null,
    receivedMessages: 18,
    eventFrames: 4,
    parsedEvents: 4,
    droppedEvents: 0,
    lastMessageType: 'event',
    lastCloseCode: null,
    message: '本地预览',
  },
  events: DEMO_EVENTS,
};

type SourceFilter = 'all' | WindSource;
type PanelView = 'stream' | 'settings';
type CommandResponse<T> = { ok: true; result: T } | { ok: false; error: string };

const SOURCE_META: Record<WindSource, { label: string; short: string }> = {
  x: { label: 'X', short: 'X' },
  telegram: { label: 'Telegram', short: 'TG' },
  fomo: { label: 'Fomo', short: 'FO' },
  pump: { label: 'Pump', short: 'PF' },
  chain: { label: '链上', short: '链' },
  news: { label: '快讯', short: '讯' },
  other: { label: '其他', short: '·' },
};

const FILTERS: Array<{ value: SourceFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'x', label: 'X' },
  { value: 'telegram', label: 'TG' },
  { value: 'fomo', label: 'Fomo' },
  { value: 'pump', label: 'Pump' },
  { value: 'chain', label: '链上' },
];

const THEME_OPTIONS = [
  { value: 'system', label: '跟随系统', Icon: Monitor },
  { value: 'light', label: '浅色', Icon: Sun },
  { value: 'dark', label: '深色', Icon: Moon },
] satisfies Array<{ value: ThemePreference; label: string; Icon: typeof Monitor }>;

function useResolvedTheme(preference: ThemePreference): 'light' | 'dark' {
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setSystemDark(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  }, [resolved]);

  return resolved;
}

const TRADE_TARGET_META: Record<TradeTarget, { label: string }> = {
  debot: { label: 'deBot' },
  gmgn: { label: 'GMGN' },
};

function phaseLabel(phase: ConnectionPhase): string {
  switch (phase) {
    case 'live':
      return 'LIVE';
    case 'connecting':
      return '连接中';
    case 'reconnecting':
      return '重连中';
    case 'offline':
      return '已暂停';
    case 'error':
      return '连接错误';
    default:
      return '连接中';
  }
}

function sessionLabel(session: SessionState, mode: string | null): string {
  if (session === 'authenticated' || mode === 'user') return '登录态已确认';
  if (session === 'guest') return 'WebSocket 游客模式';
  if (session === 'checking') return '检查登录态';
  return '登录态未知';
}

function compactAddress(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 9)}…${value.slice(-6)}`;
}

function formatUsd(value: number): string {
  const amount = Math.max(0, value);
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

function formatTradeUsd(value: number): string {
  const amount = Math.max(0, value);
  if (amount >= 1_000) return formatUsd(amount);
  if (amount >= 100) return `$${Math.round(amount).toLocaleString('en-US')}`;
  const decimals = amount >= 1 ? 2 : 4;
  return `$${amount.toFixed(decimals).replace(/\.?0+$/, '')}`;
}

function titleIncludesUsdAmount(title: string): boolean {
  return /(?:≈\s*)?\$\s*\d/i.test(title);
}

function chainPresentation(chain: string): { label: string; tone: string } {
  const normalized = chain.trim().toLowerCase();
  if (normalized === 'sol' || normalized === 'solana') {
    return { label: 'Solana', tone: 'solana' };
  }
  if (normalized === 'bsc' || normalized === 'bnb' || normalized === 'binance') {
    return { label: 'BNB Chain', tone: 'bnb' };
  }
  if (normalized === 'eth' || normalized === 'ethereum') {
    return { label: 'Ethereum', tone: 'ethereum' };
  }
  if (normalized === 'robinhood' || normalized === 'rbh') {
    return { label: 'Robinhood', tone: 'robinhood' };
  }
  if (normalized === 'base') return { label: 'Base', tone: 'base' };
  return { label: chain || '未知链', tone: 'other' };
}

function relativeTime(value: string, current: number): string {
  const seconds = Math.max(0, Math.floor((current - Date.parse(value)) / 1_000));
  if (seconds < 8) return '刚刚';
  if (seconds < 60) return `${seconds} 秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟前`;
  return `${Math.floor(minutes / 60)} 小时前`;
}

function eventLag(event: WindEvent): string {
  const value = Date.parse(event.receivedAt) - Date.parse(event.occurredAt);
  if (!Number.isFinite(value) || value < 0) return '延迟未知';
  return value >= 1_000 ? `上游 ${(value / 1_000).toFixed(1)}s` : `上游 ${value}ms`;
}

function clockTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '--:--:--';
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

async function sendCommand<T>(message: unknown): Promise<T> {
  if (!isExtension) throw new Error('本地预览不会调用扩展后台');
  const response = (await chrome.runtime.sendMessage(message)) as CommandResponse<T>;
  if (!response.ok) throw new Error(response.error);
  return response.result;
}

function playAlert(): void {
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(620, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.09);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.17);
  oscillator.addEventListener('ended', () => void context.close());
}

function SourceMark({ source }: { source: WindSource }) {
  return (
    <span className={`source-mark source-${source}`} title={SOURCE_META[source].label}>
      {SOURCE_META[source].short}
    </span>
  );
}

function EventAvatar({ event }: { event: WindEvent }) {
  return (
    <div className={`event-avatar source-${event.source}`}>
      <SourceMark source={event.source} />
      {event.avatarUrl && (
        <img
          src={event.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={(image) => {
            image.currentTarget.hidden = true;
          }}
        />
      )}
    </div>
  );
}

function ConsensusContent({ consensus, title }: { consensus: ConsensusRef; title: string }) {
  const people = consensus.people || consensus.participants.length;
  return (
    <section className="consensus-block" aria-label="共识买入明细">
      <div className="consensus-title">
        <UsersRound size={17} aria-hidden="true" />
        <h2>{title}</h2>
      </div>
      <dl className="consensus-metrics">
        <div>
          <dt>参与</dt>
          <dd>{people || '—'}<small>人</small></dd>
        </div>
        <div>
          <dt>时间窗</dt>
          <dd>{consensus.windowMinutes ?? '—'}<small>分钟</small></dd>
        </div>
        <div>
          <dt>净买入</dt>
          <dd>{consensus.totalUsd != null ? `≈${formatUsd(consensus.totalUsd)}` : '—'}</dd>
        </div>
      </dl>
      {consensus.participants.length > 0 && (
        <div className="consensus-detail">
          <div className="consensus-detail-head">
            <span>参与明细</span>
            <span>净买入</span>
          </div>
          <ul className="consensus-participants">
            {consensus.participants.map((participant, index) => {
              const platform = participant.platform?.toLowerCase() ?? '';
              const platformLabel = platform === 'pumpfun' ? 'PF' : platform === 'fomo' ? 'FO' : '·';
              return (
                <li key={`${participant.label}-${index}`}>
                  <span
                    className={`participant-platform platform-${platform || 'other'}`}
                    title={platform === 'pumpfun' ? 'Pump.fun' : platform === 'fomo' ? 'Fomo' : '未知平台'}
                  >
                    {platformLabel}
                  </span>
                  <span className="participant-name" title={participant.label}>{participant.label}</span>
                  <strong>{participant.usd != null ? `≈${formatUsd(participant.usd)}` : '—'}</strong>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function TokenPanel({ token, onCopy }: { token: TokenRef; onCopy: () => void }) {
  const chain = chainPresentation(token.chain);
  const symbol = token.symbol || 'TOKEN';
  return (
    <section className="asset-panel" aria-label={`${symbol} 代币和合约`}>
      <div className="asset-overview">
        <span className="token-avatar" aria-hidden="true">
          <Coins size={16} />
          {token.imageUrl && (
            <img
              src={token.imageUrl}
              alt=""
              referrerPolicy="no-referrer"
              onError={(image) => {
                image.currentTarget.hidden = true;
              }}
            />
          )}
        </span>
        <span className="asset-identity">
          <strong>${symbol}</strong>
          {token.name && token.name !== token.symbol && <small>{token.name}</small>}
        </span>
        <span className={`chain-badge chain-${chain.tone}`}>
          <Network size={12} aria-hidden="true" />
          {chain.label}
        </span>
      </div>
      <div className="contract-row">
        <span className="contract-label">CA</span>
        <code title={token.address}>{compactAddress(token.address)}</code>
        <button type="button" onClick={onCopy} aria-label={`复制 ${symbol} 合约地址`}>
          <Clipboard size={14} />
        </button>
      </div>
    </section>
  );
}

function EventItem({
  event,
  featured,
  currentTime,
  busyTarget,
  onTrade,
  onCopy,
  onSource,
}: {
  event: WindEvent;
  featured?: boolean;
  currentTime: number;
  busyTarget?: TradeTarget;
  onTrade: (event: WindEvent, target: TradeTarget) => void;
  onCopy: (event: WindEvent) => void;
  onSource: (event: WindEvent) => void;
}) {
  const operation = operationPresentation(event);
  const author = event.author || SOURCE_META[event.source].label;
  const authorHandle = event.authorHandle?.replace(/^@+/, '');
  return (
    <article
      className={`event-item source-${event.source} ${event.consensus ? 'is-consensus' : ''} ${featured ? 'is-featured' : ''} importance-${event.importance}`}
    >
      <div className="event-head">
        <EventAvatar event={event} />
        <div className="event-identity">
          <div className="event-identity-main">
            <strong title={author}>{author}</strong>
            <span className={`signal-chip operation-${operation.tone}`}>
              {SOURCE_META[event.source].label} · {operation.label}
            </span>
            {featured && <span className="fresh-chip">最新</span>}
          </div>
          {authorHandle && (
            <div className="event-identity-sub">
              <span className="event-handle" title={`@${authorHandle}`}>@{authorHandle}</span>
            </div>
          )}
        </div>
        <div className="event-clock">
          <time dateTime={event.occurredAt}>{clockTime(event.occurredAt)}</time>
          <small>{relativeTime(event.occurredAt, currentTime)} · {eventLag(event)}</small>
        </div>
      </div>

      <div className="event-content">
        {event.consensus ? (
          <ConsensusContent consensus={event.consensus} title={event.title} />
        ) : (
          <>
            <h2>
              {event.amountUsd != null && !titleIncludesUsdAmount(event.title) && (
                <span className="trade-amount">≈{formatTradeUsd(event.amountUsd)} · </span>
              )}
              {event.title}
            </h2>
            {event.body && <p>{event.body}</p>}
          </>
        )}

        {event.token && (
          <TokenPanel token={event.token} onCopy={() => onCopy(event)} />
        )}

        <div className="event-actions">
          {event.token ? (
            <div className="trade-destinations" aria-label="打开交易平台">
              {(Object.keys(TRADE_TARGET_META) as TradeTarget[]).map((target) => (
                <button
                  key={target}
                  className="trade-destination"
                  type="button"
                  disabled={busyTarget != null}
                  onClick={() => onTrade(event, target)}
                >
                  {busyTarget === target ? (
                    <RefreshCw className="spin" size={13} aria-hidden="true" />
                  ) : (
                    <ExternalLink size={12} aria-hidden="true" />
                  )}
                  <span>{TRADE_TARGET_META[target].label}</span>
                </button>
              ))}
            </div>
          ) : (
            <span className="no-target">无可路由标的</span>
          )}
          {event.sourceUrl && (
            <button className="source-link" type="button" onClick={() => onSource(event)}>
              看原文 <ExternalLink size={14} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function SettingsView({
  snapshot,
  onBack,
  onSaved,
  onThemePreview,
}: {
  snapshot: RuntimeSnapshot;
  onBack: () => void;
  onSaved: (snapshot: RuntimeSnapshot) => void;
  onThemePreview: (theme: ThemePreference) => void;
}) {
  const [draft, setDraft] = useState<StreamConfig>(snapshot.config);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isExtension) {
        const next = await sendCommand<RuntimeSnapshot>({
          type: 'config:save',
          config: draft,
        });
        onSaved(next);
      } else {
        onSaved({ ...snapshot, config: draft });
      }
      onBack();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const injectDemo = async () => {
    if (!isExtension) return;
    setSaving(true);
    setError(null);
    try {
      const next = await sendCommand<RuntimeSnapshot>({ type: 'demo:inject' });
      onSaved(next);
      onBack();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="settings-view">
      <header className="settings-header">
        <button type="button" className="icon-key" onClick={onBack} aria-label="返回实时流">
          <ArrowLeft size={19} />
        </button>
        <div>
          <h1>实时流与交易路由</h1>
          <p>插件通过已登录的听风页面接收个人实时流</p>
        </div>
      </header>

      <form onSubmit={save}>
        <section className="settings-section appearance-section">
          <h2>外观</h2>
          <div className="theme-options" role="group" aria-label="界面主题">
            {THEME_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                className={draft.theme === value ? 'is-active' : ''}
                aria-pressed={draft.theme === value}
                onClick={() => {
                  setDraft((current) => ({ ...current, theme: value }));
                  onThemePreview(value);
                }}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <p className="theme-help">跟随系统会随设备外观自动切换；深色主题适合低光盯盘。</p>
        </section>

        <section className="settings-section">
          <h2>听风页面桥接</h2>
          <div className="fixed-endpoint">
            <span>页面同源 WebSocket</span>
            <code>{WIND_WEBSOCKET_URL}</code>
          </div>
          <div className={`session-row session-${snapshot.connection.session}`}>
            <span className="status-lamp" />
            <div>
              <strong>{sessionLabel(snapshot.connection.session, snapshot.connection.mode)}</strong>
              <small>
                已接收 {snapshot.connection.receivedMessages} 帧
                {' · '}事件 {snapshot.connection.eventFrames}
                {' · '}入流 {snapshot.connection.parsedEvents}
                {snapshot.connection.droppedEvents
                  ? ` · 丢弃 ${snapshot.connection.droppedEvents}`
                  : ''}
                {snapshot.connection.lastMessageType
                  ? ` · 最近 ${snapshot.connection.lastMessageType}`
                  : ''}
              </small>
            </div>
          </div>
          <button
            type="button"
            className="text-action"
            onClick={() => {
              if (isExtension) void sendCommand({ type: 'wind:open' });
              else window.open('https://wind.jokkimon.club/', '_blank', 'noopener,noreferrer');
            }}
          >
            <ExternalLink size={14} />
            打开听风登录页
          </button>
          <button
            type="button"
            className="text-action"
            disabled={saving}
            onClick={() => void injectDemo()}
          >
            <Zap size={14} />
            载入“玩偶兔子”诊断卡片
          </button>
        </section>

        <section className="settings-section">
          <h2>交易目标</h2>
          <label>
            <span>deBot 链接模板</span>
            <input
              value={draft.debotUrlTemplate}
              inputMode="url"
              onChange={(event) =>
                setDraft({ ...draft, debotUrlTemplate: event.target.value })
              }
            />
          </label>
          <label>
            <span>GMGN 链接模板</span>
            <input
              value={draft.gmgnUrlTemplate}
              inputMode="url"
              onChange={(event) =>
                setDraft({ ...draft, gmgnUrlTemplate: event.target.value })
              }
            />
          </label>
          <p className="field-help">可用占位符：{'{chain}'}、{'{address}'}、{'{symbol}'}</p>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={draft.reuseTradingTab}
              onChange={(event) =>
                setDraft({ ...draft, reuseTradingTab: event.target.checked })
              }
            />
            <span>
              <strong>复用已打开的交易标签页</strong>
              <small>避免每条预警都新开一个页面</small>
            </span>
          </label>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={draft.soundEnabled}
              onChange={(event) => setDraft({ ...draft, soundEnabled: event.target.checked })}
            />
            <span>
              <strong>新预警提示音</strong>
              <small>侧栏打开时播放短提示音</small>
            </span>
          </label>
        </section>

        <aside className="safety-note">
          <ShieldCheck size={18} />
          <p>插件只打开标的，不会填单、签名或自动交易。最终操作仍由你在交易网站确认。</p>
        </aside>

        {error && <div className="form-error">{error}</div>}
        <button className="save-key" type="submit" disabled={saving}>
          {saving ? <RefreshCw className="spin" size={18} /> : <Check size={18} />}
          保存设置
        </button>
      </form>
    </main>
  );
}

function App() {
  const [view, setView] = useState<PanelView>('stream');
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot>(
    isExtension
      ? { config: DEFAULT_CONFIG, connection: EMPTY_CONNECTION, events: [] }
      : DEMO_SNAPSHOT,
  );
  const [filter, setFilter] = useState<SourceFilter>('all');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [busyTrade, setBusyTrade] = useState<{
    eventId: string;
    target: TradeTarget;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const [themePreview, setThemePreview] = useState<ThemePreference | null>(null);
  const previousEventId = useRef<string | null>(snapshot.events[0]?.id ?? null);
  const resolvedTheme = useResolvedTheme(themePreview ?? snapshot.config.theme);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isExtension) return;
    const port = chrome.runtime.connect({ name: 'wind-sidepanel' });
    const handleMessage = (message: BackgroundPush) => {
      if (message.type === 'snapshot') {
        setSnapshot(message.snapshot);
        previousEventId.current = message.snapshot.events[0]?.id ?? null;
      } else if (message.type === 'connection') {
        setSnapshot((current) => ({ ...current, connection: message.connection }));
      } else if (message.type === 'event') {
        const isNewEvent = previousEventId.current !== message.event.id;
        setSnapshot((current) => ({
          ...current,
          events: [message.event, ...current.events.filter((item) => item.id !== message.event.id)],
        }));
        if (previousEventId.current && isNewEvent) {
          if (snapshot.config.soundEnabled) playAlert();
        }
        if (isNewEvent) {
          setLiveAnnouncement(
            `新预警，${SOURCE_META[message.event.source].label}，${message.event.author || '未知账户'}：${message.event.title}`,
          );
        }
        previousEventId.current = message.event.id;
      }
    };
    port.onMessage.addListener(handleMessage);
    return () => {
      port.onMessage.removeListener(handleMessage);
      port.disconnect();
    };
  }, [snapshot.config.soundEnabled]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2_400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const visibleEvents = useMemo(
    () =>
      filter === 'all'
        ? snapshot.events
        : snapshot.events.filter((event) => event.source === filter),
    [filter, snapshot.events],
  );

  const openTrade = async (event: WindEvent, target: TradeTarget) => {
    const targetLabel = TRADE_TARGET_META[target].label;
    setBusyTrade({ eventId: event.id, target });
    try {
      if (isExtension) {
        const result = await sendCommand<{ reused: boolean }>({
          type: 'trade:open',
          target,
          event,
        });
        setNotice(
          result.reused
            ? `已切换到现有 ${targetLabel} 标签页`
            : `已在 ${targetLabel} 打开交易标的`,
        );
      } else {
        setNotice(`本地预览：将在 ${targetLabel} 打开交易标的`);
      }
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusyTrade((current) =>
        current?.eventId === event.id && current.target === target ? null : current,
      );
    }
  };

  const copyAddress = async (event: WindEvent) => {
    if (!event.token) return;
    try {
      await navigator.clipboard.writeText(event.token.address);
      setNotice('合约地址已复制');
    } catch {
      setNotice('复制失败，请手动选择合约地址');
    }
  };

  const openSource = (event: WindEvent) => {
    if (!event.sourceUrl) return;
    if (isExtension) void chrome.tabs.create({ url: event.sourceUrl });
    else window.open(event.sourceUrl, '_blank', 'noopener,noreferrer');
  };

  const toggleConnection = async () => {
    if (!isExtension) {
      setSnapshot((current) => ({
        ...current,
        connection: {
          ...current.connection,
          phase: current.connection.phase === 'live' ? 'offline' : 'live',
        },
      }));
      return;
    }
    const shouldPause =
      snapshot.connection.phase === 'live' &&
      snapshot.connection.session === 'authenticated';
    const type = shouldPause ? 'stream:disconnect' : 'stream:connect';
    const next = await sendCommand<RuntimeSnapshot>({ type });
    setSnapshot(next);
  };

  const toggleSound = async () => {
    const previous = snapshot;
    const nextConfig = {
      ...snapshot.config,
      soundEnabled: !snapshot.config.soundEnabled,
    };
    setSnapshot((current) => ({ ...current, config: nextConfig }));
    if (!isExtension) return;
    try {
      const next = await sendCommand<RuntimeSnapshot>({
        type: 'config:save',
        config: nextConfig,
      });
      setSnapshot(next);
    } catch (cause) {
      setSnapshot(previous);
      setNotice(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const toggleTheme = async () => {
    const previous = snapshot;
    const nextConfig: StreamConfig = {
      ...snapshot.config,
      theme: resolvedTheme === 'dark' ? 'light' : 'dark',
    };
    setSnapshot((current) => ({ ...current, config: nextConfig }));
    if (!isExtension) return;
    try {
      const next = await sendCommand<RuntimeSnapshot>({
        type: 'config:save',
        config: nextConfig,
      });
      setSnapshot(next);
    } catch (cause) {
      setSnapshot(previous);
      setNotice(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const closeSettings = () => {
    setThemePreview(null);
    setView('stream');
  };

  if (view === 'settings') {
    return (
      <SettingsView
        snapshot={snapshot}
        onBack={closeSettings}
        onSaved={(next) => {
          setSnapshot(next);
          setThemePreview(null);
        }}
        onThemePreview={setThemePreview}
      />
    );
  }

  const live = snapshot.connection.phase === 'live';
  const needsLogin = snapshot.connection.session === 'guest';

  return (
    <main className="stream-view">
      <header className="console-header">
        <div className="brand">
          <span className="brand-mark"><Radio size={18} /></span>
          <div>
            <h1>听风实时流</h1>
            <span>{isExtension ? '预警已接入交易侧栏' : '合成事件 · 本地预览'}</span>
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className={`status-key phase-${snapshot.connection.phase}`}
            onClick={() => void toggleConnection()}
            aria-label={live && !needsLogin ? '暂停实时流' : '连接实时流'}
          >
            <span className="status-lamp" />
            <b>{needsLogin ? '游客模式' : phaseLabel(snapshot.connection.phase)}</b>
            {live && !needsLogin && snapshot.connection.latencyMs != null && (
              <small>{snapshot.connection.latencyMs}ms</small>
            )}
            {live && !needsLogin ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button
            className="icon-key"
            type="button"
            onClick={() => void toggleTheme()}
            aria-label={resolvedTheme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
            title={resolvedTheme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
          >
            {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            className="icon-key"
            type="button"
            onClick={() => void toggleSound()}
            aria-label={snapshot.config.soundEnabled ? '关闭提示音' : '开启提示音'}
          >
            {snapshot.config.soundEnabled ? <Bell size={17} /> : <BellOff size={17} />}
          </button>
          <button
            className="icon-key"
            type="button"
            onClick={() => setView('settings')}
            aria-label="打开设置"
          >
            <Settings2 size={18} />
          </button>
        </div>
      </header>

      {needsLogin && (
        <section className="setup-band">
          <div>
            <strong>听风页面当前使用游客模式</strong>
            <p>请在听风页面重新登录；扩展会复用页面自身的登录会话，不会读取 Cookie。</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isExtension) void sendCommand({ type: 'wind:open' });
              else window.open('https://wind.jokkimon.club/', '_blank', 'noopener,noreferrer');
            }}
          >
            打开听风 <ExternalLink size={16} />
          </button>
        </section>
      )}

      {snapshot.connection.message && snapshot.connection.phase !== 'live' && !needsLogin && (
        <div className="connection-note">
          {snapshot.connection.message}
          {snapshot.connection.phase === 'reconnecting' && snapshot.connection.retryAt && (
            <span> · {relativeTime(snapshot.connection.retryAt, currentTime)}</span>
          )}
        </div>
      )}

      <nav className="source-filters" aria-label="筛选预警来源">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={filter === item.value ? 'is-active' : ''}
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
            <span>
              {item.value === 'all'
                ? snapshot.events.length
                : snapshot.events.filter((event) => event.source === item.value).length}
            </span>
          </button>
        ))}
      </nav>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      <section className="event-feed">
        {visibleEvents.length ? (
          visibleEvents.map((event, index) => (
            <EventItem
              key={event.id}
              event={event}
              featured={index === 0}
              currentTime={currentTime}
              busyTarget={busyTrade?.eventId === event.id ? busyTrade.target : undefined}
              onTrade={(item, target) => void openTrade(item, target)}
              onCopy={(item) => void copyAddress(item)}
              onSource={openSource}
            />
          ))
        ) : (
          <div className="empty-feed">
            <Radio size={28} />
            <strong>
              {snapshot.connection.phase === 'connecting' ||
              snapshot.connection.phase === 'reconnecting'
                ? '正在连接听风'
                : needsLogin
                  ? '等待听风登录'
                  : live
                    ? '连接成功，等待新预警'
                    : '实时流暂不可用'}
            </strong>
            <p>
              {live
                ? `协议帧 ${snapshot.connection.receivedMessages} · 事件帧 ${snapshot.connection.eventFrames} · 已入流 ${snapshot.connection.parsedEvents} · 卡片 ${snapshot.events.length}`
                : '点击顶部连接状态可以立即重试。'}
            </p>
          </div>
        )}
      </section>

      <footer className="console-footer">
        <span>
          <span className={`footer-dot phase-${snapshot.connection.phase}`} />
          {snapshot.events.length} 条预警
          {snapshot.connection.latencyMs != null ? ` · ${snapshot.connection.latencyMs}ms` : ''}
        </span>
        <button
          type="button"
          onClick={() => {
            if (isExtension) void sendCommand({ type: 'events:clear' }).then(() =>
              setSnapshot((current) => ({ ...current, events: [] })),
            );
            else setSnapshot((current) => ({ ...current, events: [] }));
          }}
        >
          清空
        </button>
      </footer>

      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
