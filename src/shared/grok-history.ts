import type { GrokChatContext, GrokChatRole } from './protocol';

export const GROK_CONVERSATION_LIMIT = 24;
export const GROK_MESSAGE_LIMIT = 60;

export interface GrokConversationMessage {
  id: string;
  role: GrokChatRole;
  content: string;
  requestContent?: string;
  citations?: string[];
  createdAt: string;
}

export interface GrokConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  context?: GrokChatContext;
  messages: GrokConversationMessage[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

function isoDate(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return fallback;
  return new Date(value).toISOString();
}

export function normalizeGrokChatContext(value: unknown): GrokChatContext | undefined {
  if (!isRecord(value)) return undefined;
  const context: GrokChatContext = {
    eventId: text(value.eventId, 180),
    symbol: text(value.symbol, 80),
    name: text(value.name, 160),
    chain: text(value.chain, 80),
    address: text(value.address, 240),
    sourceLabel: text(value.sourceLabel, 80),
    authorHandle: text(value.authorHandle, 160),
    title: text(value.title, 1_000),
    body: text(value.body, 4_000),
  };
  return Object.values(context).some(Boolean) ? context : undefined;
}

function normalizeMessage(value: unknown, fallbackTime: string): GrokConversationMessage | null {
  if (!isRecord(value)) return null;
  const role = value.role === 'user' || value.role === 'assistant' ? value.role : null;
  const content = text(value.content, 16_000);
  const id = text(value.id, 180);
  if (!role || !content || !id) return null;
  const citations = Array.isArray(value.citations)
    ? value.citations
        .filter((item): item is string => typeof item === 'string' && /^https?:\/\//i.test(item))
        .slice(0, 12)
    : undefined;
  return {
    id,
    role,
    content,
    requestContent: text(value.requestContent, 16_000),
    citations: citations?.length ? citations : undefined,
    createdAt: isoDate(value.createdAt, fallbackTime),
  };
}

export function normalizeGrokConversations(value: unknown): GrokConversation[] {
  if (!Array.isArray(value)) return [];
  const now = new Date().toISOString();
  const seen = new Set<string>();
  return value
    .map((item): GrokConversation | null => {
      if (!isRecord(item)) return null;
      const id = text(item.id, 180);
      if (!id || seen.has(id)) return null;
      seen.add(id);
      const createdAt = isoDate(item.createdAt, now);
      const messages = Array.isArray(item.messages)
        ? item.messages
            .map((message) => normalizeMessage(message, createdAt))
            .filter((message): message is GrokConversationMessage => Boolean(message))
            .slice(-GROK_MESSAGE_LIMIT)
        : [];
      return {
        id,
        title: text(item.title, 80) ?? '新对话',
        createdAt,
        updatedAt: isoDate(item.updatedAt, createdAt),
        context: normalizeGrokChatContext(item.context),
        messages,
      };
    })
    .filter((item): item is GrokConversation => Boolean(item))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, GROK_CONVERSATION_LIMIT);
}

export function newGrokConversation(context?: GrokChatContext): GrokConversation {
  const now = new Date().toISOString();
  const symbol = context?.symbol ? `$${context.symbol}` : context?.name;
  return {
    id: crypto.randomUUID(),
    title: symbol ? `${symbol} · 叙事调查` : '新对话',
    createdAt: now,
    updatedAt: now,
    context,
    messages: [],
  };
}

export function grokConversationTitle(prompt: string): string {
  const firstLine = prompt.replace(/\s+/g, ' ').trim();
  if (!firstLine) return '新对话';
  return firstLine.length > 30 ? `${firstLine.slice(0, 30)}…` : firstLine;
}
