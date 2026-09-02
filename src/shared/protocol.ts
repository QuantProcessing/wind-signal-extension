export const WIND_ORIGIN = 'https://wind.jokkimon.club';
export const WIND_WEBSOCKET_URL = 'wss://wind.jokkimon.club/ws';
export const WIND_FEED_ACTIONS =
  'tweet,reply,quote,repost,delete_post,fomo_buy,fomo_sell,fomo_swap,fomo_thesis,fomo_consensus,fomo_cash,fomo_verified,binance_new,pump_callout,pump_update,pump_buy,pump_sell,ansem_tier,ansem_burn';

export type WindSource = 'x' | 'telegram' | 'fomo' | 'pump' | 'chain' | 'news' | 'other';
export type Importance = 'urgent' | 'high' | 'normal';
export type ConnectionPhase = 'connecting' | 'live' | 'reconnecting' | 'offline' | 'error';
export type SessionState = 'checking' | 'authenticated' | 'guest' | 'unknown';
export type TradeTarget = 'debot' | 'gmgn';
export type PositionSequence = 'first' | 'reenter' | 'add';

export interface TokenRef {
  chain: string;
  address: string;
  symbol?: string;
  name?: string;
  imageUrl?: string;
  quote?: TokenQuoteRef;
}

export interface TokenQuoteRef {
  marketCapUsd?: number;
  volume24hUsd?: number;
  priceUsd?: number;
}

export interface TradeRef {
  tokenAmount?: number;
  priceUsd?: number;
  marketCapUsd?: number;
  cashSymbol?: string;
  route?: string;
  venue?: string;
}

export interface SocialMediaRef {
  type?: string;
  url: string;
  posterUrl?: string;
}

export interface SocialReferenceRef {
  kind: 'reply' | 'quote' | 'repost' | 'reference';
  author?: string;
  authorHandle?: string;
  avatarUrl?: string;
  text?: string;
  translation?: string;
  media: SocialMediaRef[];
}

export interface SocialTargetRef {
  name?: string;
  handle?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  bioTranslation?: string;
  followers?: number;
  following?: number;
  verified?: boolean;
  profileUrl?: string;
}

export interface ConsensusParticipant {
  label: string;
  usd?: number;
  platform?: string;
}

export interface ConsensusRef {
  people: number;
  windowMinutes?: number;
  totalUsd?: number;
  participants: ConsensusParticipant[];
}

export interface PositionRef {
  sequence?: PositionSequence;
  percent?: number;
  closed?: boolean;
}

export interface WindEvent {
  id: string;
  sequence?: number;
  source: WindSource;
  action?: string;
  occurredAt: string;
  receivedAt: string;
  author?: string;
  authorHandle?: string;
  avatarUrl?: string;
  title: string;
  body?: string;
  amountUsd?: number;
  trade?: TradeRef;
  importance: Importance;
  token?: TokenRef;
  consensus?: ConsensusRef;
  position?: PositionRef;
  reference?: SocialReferenceRef;
  target?: SocialTargetRef;
  sourceUrl?: string;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface StreamConfig {
  debotUrlTemplate: string;
  gmgnUrlTemplate: string;
  sub2ApiBaseUrl: string;
  grokModel: string;
  reuseTradingTab: boolean;
  soundEnabled: boolean;
  theme: ThemePreference;
}

export type GrokChatRole = 'user' | 'assistant';

export interface GrokChatMessage {
  role: GrokChatRole;
  content: string;
}

export interface GrokChatResult {
  text: string;
  citations: string[];
}

export interface GrokChatContext {
  eventId?: string;
  symbol?: string;
  name?: string;
  chain?: string;
  address?: string;
  sourceLabel?: string;
  authorHandle?: string;
  title?: string;
  body?: string;
}

export interface ConnectionState {
  phase: ConnectionPhase;
  session: SessionState;
  mode: string | null;
  latencyMs: number | null;
  lastEventAt: string | null;
  retryAt: string | null;
  receivedMessages: number;
  eventFrames: number;
  parsedEvents: number;
  droppedEvents: number;
  lastMessageType: string | null;
  lastCloseCode: number | null;
  message?: string;
}

export interface RuntimeSnapshot {
  config: StreamConfig;
  connection: ConnectionState;
  events: WindEvent[];
}

export type PanelCommand =
  | { type: 'snapshot:get' }
  | { type: 'stream:connect' }
  | { type: 'stream:disconnect' }
  | { type: 'config:save'; config: StreamConfig }
  | { type: 'demo:inject' }
  | { type: 'wind:open' }
  | { type: 'trade:open'; target: TradeTarget; event: WindEvent }
  | { type: 'grok:chat'; messages: GrokChatMessage[] }
  | { type: 'grok:window:open'; context?: GrokChatContext }
  | { type: 'events:clear' };

export type BackgroundPush =
  | { type: 'snapshot'; snapshot: RuntimeSnapshot }
  | { type: 'connection'; connection: ConnectionState }
  | { type: 'event'; event: WindEvent };

export const DEFAULT_CONFIG: StreamConfig = {
  debotUrlTemplate: 'https://debot.ai/token/{chain}/{address}',
  gmgnUrlTemplate: 'https://gmgn.ai/{chain}/token/{address}',
  sub2ApiBaseUrl: '',
  grokModel: 'grok-4.5',
  reuseTradingTab: true,
  soundEnabled: true,
  theme: 'system',
};

export const EMPTY_CONNECTION: ConnectionState = {
  phase: 'offline',
  session: 'checking',
  mode: null,
  latencyMs: null,
  lastEventAt: null,
  retryAt: null,
  receivedMessages: 0,
  eventFrames: 0,
  parsedEvents: 0,
  droppedEvents: 0,
  lastMessageType: null,
  lastCloseCode: null,
};

export const STORAGE_KEYS = {
  config: 'windStreamConfig',
  events: 'windStreamEvents',
  grokApiKey: 'grokApiKey',
  grokConversations: 'grokConversations',
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function numericValue(value: unknown): number | undefined {
  const direct = numberValue(value);
  if (direct != null) return direct;
  const raw = stringValue(value)?.replace(/[,$≈\s]/g, '');
  if (!raw) return undefined;
  const match = raw.match(/^(-?\d+(?:\.\d+)?)([kmb])?$/i);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const multiplier = { k: 1_000, m: 1_000_000, b: 1_000_000_000 }[
    (match[2] ?? '').toLowerCase()
  ] ?? 1;
  const result = amount * multiplier;
  return Number.isFinite(result) ? result : undefined;
}

function translationValue(value: unknown): string | undefined {
  return stringValue(value) ?? (isRecord(value) ? stringValue(value.text) : undefined);
}

function httpUrlValue(value: unknown): string | undefined {
  const raw = stringValue(value);
  if (!raw) return undefined;
  try {
    const url = new URL(raw, WIND_ORIGIN);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function mediaValues(value: unknown): SocialMediaRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): SocialMediaRef[] => {
    if (typeof item === 'string') {
      const url = httpUrlValue(item);
      return url ? [{ url }] : [];
    }
    if (!isRecord(item)) return [];
    const url = httpUrlValue(item.url) ?? httpUrlValue(item.src) ?? httpUrlValue(item.poster);
    if (!url) return [];
    const posterUrl = httpUrlValue(item.poster);
    return [
      {
        url,
        ...(stringValue(item.type) ? { type: stringValue(item.type) } : {}),
        ...(posterUrl && posterUrl !== url ? { posterUrl } : {}),
      },
    ];
  });
}

function tokenQuoteValue(value: unknown): TokenQuoteRef | undefined {
  if (!isRecord(value)) return undefined;
  const marketCapUsd = nonnegativeNumericValue(
    value.marketCapUsd,
    value.market_cap_usd,
    value.mc,
    value.mcap,
  );
  const volume24hUsd = nonnegativeNumericValue(
    value.volume24hUsd,
    value.volume_24h_usd,
    value.vol24h,
    value.volume24h,
  );
  const priceUsd = nonnegativeNumericValue(value.priceUsd, value.price_usd, value.price);
  if (marketCapUsd == null && volume24hUsd == null && priceUsd == null) return undefined;
  return { marketCapUsd, volume24hUsd, priceUsd };
}

function tradeValue(value: unknown): TradeRef | undefined {
  if (!isRecord(value)) return undefined;
  const tokenAmount = nonnegativeNumericValue(
    value.tokenAmount,
    value.token_amount,
    value.amount,
  );
  const priceUsd = nonnegativeNumericValue(value.priceUsd, value.price_usd, value.price);
  const marketCapUsd = nonnegativeNumericValue(
    value.marketCapUsd,
    value.market_cap_usd,
    value.mcap,
    value.market_cap,
  );
  const cashSymbol = stringValue(value.cashSymbol) ?? stringValue(value.cash_symbol);
  const route = stringValue(value.route);
  const venue = stringValue(value.venue) ?? stringValue(value.via);
  if (
    tokenAmount == null &&
    priceUsd == null &&
    marketCapUsd == null &&
    !cashSymbol &&
    !route &&
    !venue
  ) {
    return undefined;
  }
  return { tokenAmount, priceUsd, marketCapUsd, cashSymbol, route, venue };
}

function referenceKindValue(
  value: unknown,
  action: string,
): SocialReferenceRef['kind'] {
  const kind = stringValue(value)?.toLowerCase();
  if (kind === 'reply' || kind === 'quote' || kind === 'repost') return kind;
  if (action === 'reply' || action === 'quote' || action === 'repost') return action;
  return 'reference';
}

function socialReferenceValue(value: unknown, action: string): SocialReferenceRef | undefined {
  if (!isRecord(value)) return undefined;
  const author = stringValue(value.author) ?? stringValue(value.author_name);
  const authorHandle =
    stringValue(value.authorHandle) ??
    stringValue(value.author_handle) ??
    stringValue(value.handle);
  const avatarUrl =
    httpUrlValue(value.avatarUrl) ??
    httpUrlValue(value.author_avatar) ??
    httpUrlValue(value.avatar);
  const text = stringValue(value.text) ?? stringValue(value.reference_text);
  const translation =
    translationValue(value.translation) ?? translationValue(value.reference_translation);
  const media = mediaValues(value.media ?? value.reference_media);
  if (!author && !authorHandle && !avatarUrl && !text && !translation && !media.length) {
    return undefined;
  }
  return {
    kind: referenceKindValue(value.kind ?? value.type, action),
    author,
    authorHandle,
    avatarUrl,
    text,
    translation,
    media,
  };
}

function socialTargetValue(value: unknown): SocialTargetRef | undefined {
  if (!isRecord(value)) return undefined;
  const name = stringValue(value.name) ?? stringValue(value.author_name);
  const handle =
    stringValue(value.handle) ??
    stringValue(value.username) ??
    stringValue(value.author_handle);
  const avatarUrl =
    httpUrlValue(value.avatarUrl) ?? httpUrlValue(value.avatar_url) ?? httpUrlValue(value.avatar);
  const bannerUrl =
    httpUrlValue(value.bannerUrl) ?? httpUrlValue(value.banner_url) ?? httpUrlValue(value.banner);
  const bio = stringValue(value.bio) ?? stringValue(value.description);
  const bioTranslation =
    translationValue(value.bioTranslation) ??
    translationValue(value.bio_translation) ??
    translationValue(value.description_translation);
  const followers = nonnegativeNumericValue(value.followers, value.followers_count);
  const following = nonnegativeNumericValue(value.following, value.following_count);
  const verified = typeof value.verified === 'boolean' ? value.verified : undefined;
  const profileUrl =
    httpUrlValue(value.profileUrl) ??
    httpUrlValue(value.profile) ??
    httpUrlValue(value.url) ??
    (handle ? `https://x.com/${encodeURIComponent(handle.replace(/^@+/, ''))}` : undefined);
  if (
    !name &&
    !handle &&
    !avatarUrl &&
    !bannerUrl &&
    !bio &&
    !bioTranslation &&
    followers == null &&
    following == null &&
    verified == null &&
    !profileUrl
  ) {
    return undefined;
  }
  return {
    name,
    handle,
    avatarUrl,
    bannerUrl,
    bio,
    bioTranslation,
    followers,
    following,
    verified,
    profileUrl,
  };
}

function sourceValue(value: unknown, action?: string): WindSource {
  // The action is more specific than the transport/platform label. This also
  // migrates already-persisted Pump events that were previously stored as chain.
  if (action?.startsWith('fomo_')) return 'fomo';
  if (action?.startsWith('pump_')) return 'pump';
  const source = String(value ?? '').toLowerCase();
  if (source === 'x' || source === 'twitter') return 'x';
  if (source === 'tg' || source === 'telegram') return 'telegram';
  if (source === 'fomo') return 'fomo';
  if (source === 'pump' || source === 'pumpfun') return 'pump';
  if (
    source === 'chain' ||
    source === 'onchain' ||
    source === 'ansem'
  ) {
    return 'chain';
  }
  if (source === 'news' || source === 'binance') return 'news';
  return 'other';
}

function amountUsdFromText(value: string): number | undefined {
  const match = value.match(/≈\s*\$\s*(\d[\d,]*(?:\.\d+)?(?:[kmb])?)/i);
  return match ? numericValue(match[1]) : undefined;
}

function nonnegativeNumericValue(...values: unknown[]): number | undefined {
  for (const value of values) {
    const amount = numericValue(value);
    if (amount != null && amount >= 0) return amount;
  }
  return undefined;
}

function positionSequenceValue(value: unknown): PositionSequence | undefined {
  const sequence = stringValue(value)?.toLowerCase();
  return sequence === 'first' || sequence === 'reenter' || sequence === 'add'
    ? sequence
    : undefined;
}

function positionPercentValue(...values: unknown[]): number | undefined {
  for (const value of values) {
    const raw = typeof value === 'string' ? value.trim().replace(/%$/, '') : value;
    const percent = numericValue(raw);
    if (percent != null && percent >= 0 && percent <= 100) return percent;
  }
  return undefined;
}

function positionValue(value: unknown): PositionRef | undefined {
  if (!isRecord(value)) return undefined;
  const sequence = positionSequenceValue(value.seq) ?? positionSequenceValue(value.sequence);
  const percent = positionPercentValue(value.pct, value.percent, value.percentage);
  const closed = typeof value.closed === 'boolean' ? value.closed : undefined;
  if (sequence == null && percent == null && closed == null) return undefined;
  return { sequence, percent, closed };
}

function positionFromTrade(
  action: string,
  fomo: Record<string, unknown> | undefined,
  pump: Record<string, unknown> | undefined,
): PositionRef | undefined {
  if (action.startsWith('fomo_')) {
    // `pos` is the server-authoritative position snapshot. When present, it
    // wins over the older top-level `closed` flag even when they disagree.
    if (isRecord(fomo?.pos)) return positionValue(fomo.pos);
    if (action === 'fomo_sell') {
      const pnl = isRecord(fomo?.pnl) ? fomo.pnl : undefined;
      if (fomo?.closed === true || pnl?.closed === true) return { closed: true };
    }
  }

  // Pump currently publishes position sequence metadata for buys. Do not
  // invent partial/closed sell state when Pump sell frames omit it.
  if (action === 'pump_buy' && isRecord(pump?.pos)) return positionValue(pump.pos);
  return undefined;
}

function importanceValue(value: unknown, action?: string): Importance {
  if (value === 'urgent' || value === 'high') return value;
  if (action && /(?:buy|sell|swap|callout|verified|binance_new|ansem)/i.test(action)) {
    return 'urgent';
  }
  if (
    action &&
    /(?:reply|quote|update|consensus|thesis|follow|unfollow|description|photo|banner|name|handle|pin)/i.test(
      action,
    )
  ) {
    return 'high';
  }
  return 'normal';
}

function isoDate(value: unknown, fallback: string): string {
  let timestamp: number;
  if (typeof value === 'number' && Number.isFinite(value)) {
    timestamp = value < 10_000_000_000 ? value * 1_000 : value;
  } else {
    const raw = stringValue(value);
    if (!raw) return fallback;
    timestamp = Date.parse(raw);
  }
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : fallback;
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    follow: '关注账号',
    unfollow: '取消关注',
    tweet: '发布新动态',
    reply: '回复新动态',
    quote: '引用新动态',
    repost: '转发新动态',
    delete_post: '删除动态',
    photo: '更换头像',
    banner: '更换横幅',
    description: '更新简介',
    name: '更新昵称',
    handle: '更新账号',
    pin: '置顶动态',
    unpin: '取消置顶',
    fomo_buy: 'Fomo 买入',
    fomo_sell: 'Fomo 卖出',
    fomo_swap: 'Fomo 交易',
    fomo_thesis: 'Fomo 观点',
    fomo_consensus: 'Fomo 共识',
    fomo_cash: 'Fomo 资金变化',
    fomo_verified: 'Fomo 认证变化',
    binance_new: '币安上新',
    pump_callout: 'Pump 新喊单',
    pump_update: 'Pump 喊单更新',
    pump_buy: 'Pump 买入',
    pump_sell: 'Pump 卖出',
    ansem_tier: 'Ansem 等级变化',
    ansem_burn: 'Ansem 烧币变化',
  };
  return labels[action] ?? (action.replaceAll('_', ' ') || '听风新事件');
}

function compactTitle(value: string, fallback: string): string {
  const flattened = value.replace(/\s+/g, ' ').trim();
  if (!flattened) return fallback;
  return flattened.length > 120 ? `${flattened.slice(0, 117)}…` : flattened;
}

function chainValue(value: unknown, address: string): string {
  const chain = String(value ?? '').trim().toLowerCase();
  if (chain === 'solana') return 'sol';
  if (chain === 'ethereum') return 'eth';
  if (chain === 'binance' || chain === 'bnb') return 'bsc';
  if (chain) return chain;
  return address.startsWith('0x') ? 'evm' : 'sol';
}

function tokenFromBoardPayload(payload: Record<string, unknown>): TokenRef | undefined {
  const extra = isRecord(payload.extra) ? payload.extra : {};
  const fomo = isRecord(extra.fomo) ? extra.fomo : undefined;
  const pump = isRecord(extra.pump) ? extra.pump : undefined;
  const binance = isRecord(extra.binance) ? extra.binance : undefined;
  const ansem = isRecord(extra.ansem) ? extra.ansem : undefined;
  const caInfo = Array.isArray(payload.ca_info)
    ? payload.ca_info.find(
        (item): item is Record<string, unknown> =>
          isRecord(item) && Boolean(stringValue(item.address)),
      )
    : undefined;

  const address =
    stringValue(caInfo?.address) ??
    stringValue(fomo?.ca) ??
    stringValue(pump?.mint) ??
    stringValue(binance?.ca) ??
    stringValue(ansem?.mint);

  if (address) {
    const chain =
      caInfo?.resolved_chain ??
      caInfo?.chain ??
      pump?.chain_slug ??
      pump?.chain ??
      fomo?.chain ??
      binance?.chain;
    const quote = tokenQuoteValue(caInfo);
    return {
      chain: chainValue(chain, address),
      address,
      symbol:
        stringValue(caInfo?.symbol) ??
        stringValue(fomo?.symbol) ??
        stringValue(pump?.symbol) ??
        stringValue(binance?.symbol),
      name: stringValue(pump?.name) ?? stringValue(binance?.name),
      imageUrl: httpUrlValue(pump?.image),
      ...(quote ? { quote } : {}),
    };
  }

  const text = [payload.content_text, payload.reference_text]
    .filter((item): item is string => typeof item === 'string')
    .join(' ');
  const evm = text.match(
    /(?:^|[^\p{L}\p{N}_])(0x[a-fA-F0-9]{40})(?![\p{L}\p{N}_])/u,
  )?.[1];
  if (evm) return { chain: 'evm', address: evm };
  const sol = text.match(
    /(?:^|[^\p{L}\p{N}_])([1-9A-HJ-NP-Za-km-z]{32,44})(?![\p{L}\p{N}_])/u,
  )?.[1];
  return sol ? { chain: 'sol', address: sol } : undefined;
}

function consensusValue(value: unknown): ConsensusRef | undefined {
  if (!isRecord(value)) return undefined;
  const participants = Array.isArray(value.entities)
    ? value.entities.flatMap((item): ConsensusParticipant[] => {
        if (!isRecord(item)) return [];
        const label = stringValue(item.label);
        if (!label) return [];
        return [
          {
            label,
            usd: numericValue(item.usd),
            platform: stringValue(item.platform),
          },
        ];
      })
    : Array.isArray(value.participants)
      ? value.participants.flatMap((item): ConsensusParticipant[] => {
          if (!isRecord(item)) return [];
          const label = stringValue(item.label);
          if (!label) return [];
          return [
            {
              label,
              usd: numericValue(item.usd),
              platform: stringValue(item.platform),
            },
          ];
        })
      : [];
  const peopleRaw = numericValue(value.n) ?? numericValue(value.people) ?? participants.length;
  const people = Math.max(0, Math.floor(peopleRaw));
  const windowMinutes = numericValue(value.window_min) ?? numericValue(value.windowMinutes);
  const totalUsd = numericValue(value.total_usd) ?? numericValue(value.totalUsd);
  if (!people && windowMinutes == null && totalUsd == null && !participants.length) return undefined;
  return {
    people,
    windowMinutes:
      windowMinutes != null && windowMinutes >= 0 ? windowMinutes : undefined,
    totalUsd: totalUsd != null && totalUsd >= 0 ? totalUsd : undefined,
    participants,
  };
}

export function normalizeStreamConfig(value: unknown): StreamConfig {
  if (!isRecord(value)) return DEFAULT_CONFIG;
  return {
    debotUrlTemplate:
      stringValue(value.debotUrlTemplate) ?? DEFAULT_CONFIG.debotUrlTemplate,
    gmgnUrlTemplate:
      stringValue(value.gmgnUrlTemplate) ?? DEFAULT_CONFIG.gmgnUrlTemplate,
    sub2ApiBaseUrl:
      typeof value.sub2ApiBaseUrl === 'string'
        ? value.sub2ApiBaseUrl.trim()
        : DEFAULT_CONFIG.sub2ApiBaseUrl,
    grokModel: stringValue(value.grokModel) ?? DEFAULT_CONFIG.grokModel,
    reuseTradingTab:
      typeof value.reuseTradingTab === 'boolean'
        ? value.reuseTradingTab
        : DEFAULT_CONFIG.reuseTradingTab,
    soundEnabled:
      typeof value.soundEnabled === 'boolean'
        ? value.soundEnabled
        : DEFAULT_CONFIG.soundEnabled,
    theme:
      value.theme === 'light' || value.theme === 'dark' || value.theme === 'system'
        ? value.theme
        : DEFAULT_CONFIG.theme,
  };
}

export function parseWindEvent(
  input: unknown,
  now = new Date(),
  options: { historical?: boolean } = {},
): WindEvent | null {
  const envelope =
    isRecord(input) &&
    (input.type === 'event' || input.type === 'event_update') &&
    isRecord(input.event)
      ? input.event
      : input;
  if (!isRecord(envelope)) return null;

  const fallback = now.toISOString();

  // Accept the old normalized shape so events already in session storage
  // survive this migration.
  const normalizedId = stringValue(envelope.id);
  const normalizedTitle = stringValue(envelope.title);
  if (normalizedId && normalizedTitle) {
    const normalizedAction = stringValue(envelope.action);
    let token: TokenRef | undefined;
    if (isRecord(envelope.token)) {
      const chain = stringValue(envelope.token.chain);
      const address = stringValue(envelope.token.address);
      if (chain && address) {
        const quote = tokenQuoteValue(envelope.token.quote);
        token = {
          chain,
          address,
          symbol: stringValue(envelope.token.symbol),
          name: stringValue(envelope.token.name),
          imageUrl: httpUrlValue(envelope.token.imageUrl),
          ...(quote ? { quote } : {}),
        };
      }
    }
    const consensus = consensusValue(envelope.consensus);
    const position = positionValue(envelope.position);
    const trade = tradeValue(envelope.trade);
    const reference = socialReferenceValue(envelope.reference, normalizedAction ?? '');
    const target = socialTargetValue(envelope.target);
    return {
      id: normalizedId,
      sequence:
        typeof envelope.sequence === 'number' && Number.isSafeInteger(envelope.sequence)
          ? envelope.sequence
          : undefined,
      source: sourceValue(envelope.source, normalizedAction),
      action: normalizedAction,
      occurredAt: isoDate(envelope.occurredAt, fallback),
      receivedAt: isoDate(envelope.receivedAt, fallback),
      author: stringValue(envelope.author),
      authorHandle:
        stringValue(envelope.authorHandle) ??
        stringValue(envelope.handle),
      avatarUrl: httpUrlValue(envelope.avatarUrl),
      title: normalizedTitle,
      body: stringValue(envelope.body),
      amountUsd: nonnegativeNumericValue(envelope.amountUsd, envelope.amount_usd),
      trade,
      importance: importanceValue(envelope.importance),
      token,
      consensus,
      position,
      reference,
      target,
      sourceUrl: httpUrlValue(envelope.sourceUrl) ?? target?.profileUrl,
    };
  }

  // Native wind.jokkimon.club /ws event shape.
  const payload = isRecord(envelope.payload) ? envelope.payload : {};
  const sequence = numberValue(envelope.seq);
  const action = stringValue(envelope.action) ?? stringValue(payload.action) ?? 'other';
  const platform = stringValue(envelope.platform) ?? stringValue(payload.platform) ?? 'other';
  const tweetId = stringValue(envelope.tweet_id) ?? stringValue(payload.tweet_id);
  const id =
    (sequence != null ? String(sequence) : undefined) ??
    (tweetId ? `${platform}:${tweetId}:${action}` : undefined);
  if (!id) return null;

  const content = stringValue(payload.content_text) ?? '';
  const translation = translationValue(payload.translation);
  const label = actionLabel(action);
  const token = tokenFromBoardPayload(payload);
  const extra = isRecord(payload.extra) ? payload.extra : {};
  const fomo = isRecord(extra.fomo) ? extra.fomo : undefined;
  const pump = isRecord(extra.pump) ? extra.pump : undefined;
  const ansem = isRecord(extra.ansem) ? extra.ansem : undefined;
  const consensus = action === 'fomo_consensus' ? consensusValue(fomo?.consensus) : undefined;
  const position = positionFromTrade(action, fomo, pump);
  const trade = tradeValue(action.startsWith('pump_') ? pump : action.startsWith('fomo_') ? fomo : undefined);
  const reference = socialReferenceValue(
    {
      author_name: payload.reference_author_name,
      author_handle: payload.reference_author_handle,
      author_avatar: payload.reference_author_avatar,
      text: payload.reference_text,
      translation: payload.reference_translation,
      media: payload.reference_media,
    },
    action,
  );
  const target = socialTargetValue(payload.target);
  const amountUsd = nonnegativeNumericValue(
    pump?.amount_usd,
    pump?.amountUsd,
    pump?.usd,
    fomo?.amount_usd,
    fomo?.amountUsd,
    fomo?.usd,
    amountUsdFromText(content),
  );
  const structuredSymbol = token?.symbol ? ` $${token.symbol}` : '';
  const title = consensus
    ? `共识买入${structuredSymbol}`
    : compactTitle(content, `${label}${structuredSymbol}`);
  const body =
    consensus
      ? undefined
      : content.length > 120
      ? content
      : translation && translation !== content
        ? translation
        : undefined;
  const occurredValue = envelope.ts ?? payload.timestamp;
  const occurredAt = isoDate(occurredValue, fallback);
  const explicitReceived = envelope.received_ts ?? payload.received_ts;
  const latencyMs = numberValue(payload.latency_ms);
  const occurredMs = Date.parse(occurredAt);
  const receivedAt =
    explicitReceived != null
      ? isoDate(explicitReceived, fallback)
      : latencyMs != null && latencyMs >= 0 && latencyMs <= 30_000 && Number.isFinite(occurredMs)
        ? new Date(occurredMs + latencyMs).toISOString()
        : options.historical
          ? occurredAt
          : fallback;
  const sourceUrl =
    httpUrlValue(payload.tweet_url) ??
    httpUrlValue(fomo?.tx_url) ??
    httpUrlValue(pump?.tx_url) ??
    httpUrlValue(pump?.url) ??
    httpUrlValue(ansem?.url) ??
    target?.profileUrl;

  return {
    id,
    sequence: sequence != null && Number.isSafeInteger(sequence) ? sequence : undefined,
    source: sourceValue(platform, action),
    action,
    occurredAt,
    receivedAt,
    author:
      stringValue(payload.author_name) ??
      stringValue(payload.handle) ??
      stringValue(envelope.handle),
    authorHandle:
      stringValue(payload.handle) ??
      stringValue(payload.author_handle) ??
      stringValue(payload.author_username) ??
      stringValue(envelope.handle) ??
      stringValue(fomo?.x_username) ??
      stringValue(pump?.x_username),
    avatarUrl: httpUrlValue(payload.avatar_url),
    title,
    body,
    amountUsd,
    trade,
    importance: importanceValue(undefined, action),
    token,
    consensus,
    position,
    reference,
    target,
    sourceUrl,
  };
}

function historyCollections(input: unknown): unknown[][] {
  if (Array.isArray(input)) return [input];
  if (!isRecord(input)) return [];

  const collections: unknown[][] = [];
  if (Array.isArray(input.events)) collections.push(input.events);
  for (const key of ['feed', 'activities']) {
    const section = input[key];
    if (isRecord(section) && Array.isArray(section.events)) collections.push(section.events);
  }
  return collections;
}

export function compareWindEvents(left: WindEvent, right: WindEvent): number {
  if (left.sequence != null && right.sequence != null && left.sequence !== right.sequence) {
    return right.sequence - left.sequence;
  }
  return Date.parse(right.receivedAt) - Date.parse(left.receivedAt);
}

export function parseWindHistory(input: unknown, now = new Date()): WindEvent[] {
  const byId = new Map<string, WindEvent>();
  for (const collection of historyCollections(input)) {
    for (const raw of collection) {
      const event = parseWindEvent(raw, now, { historical: true });
      if (event) byId.set(event.id, event);
    }
  }
  return [...byId.values()].sort(compareWindEvents);
}
