import { describe, expect, it } from 'vitest';
import {
  GROK_CONVERSATION_LIMIT,
  grokConversationTitle,
  normalizeGrokConversations,
} from './grok-history';

describe('Grok conversation history', () => {
  it('normalizes, sorts and strips malformed conversation data', () => {
    const result = normalizeGrokConversations([
      {
        id: 'older',
        title: '  旧对话  ',
        createdAt: '2026-08-31T00:00:00.000Z',
        updatedAt: '2026-08-31T01:00:00.000Z',
        context: { address: '  0x123  ', ignored: 'value' },
        messages: [{ id: 'm1', role: 'user', content: '  hello  ' }],
      },
      {
        id: 'newer',
        title: '新对话',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T01:00:00.000Z',
        messages: [{ id: 'bad', role: 'system', content: 'ignored' }],
      },
    ]);

    expect(result.map((item) => item.id)).toEqual(['newer', 'older']);
    expect(result[1].context).toEqual({ address: '0x123' });
    expect(result[1].messages[0]).toMatchObject({ role: 'user', content: 'hello' });
    expect(result[0].messages).toEqual([]);
  });

  it('caps stored conversations and creates compact titles', () => {
    const stored = Array.from({ length: GROK_CONVERSATION_LIMIT + 5 }, (_, index) => ({
      id: `chat-${index}`,
      title: `Chat ${index}`,
      createdAt: new Date(index * 1_000).toISOString(),
      updatedAt: new Date(index * 1_000).toISOString(),
      messages: [],
    }));
    expect(normalizeGrokConversations(stored)).toHaveLength(GROK_CONVERSATION_LIMIT);
    expect(grokConversationTitle('  请调查这个代币的叙事以及最早的传播来源和风险  ')).toBe(
      '请调查这个代币的叙事以及最早的传播来源和风险',
    );
  });
});
