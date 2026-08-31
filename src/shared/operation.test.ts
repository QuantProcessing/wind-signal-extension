import { describe, expect, it } from 'vitest';
import type { WindEvent } from './protocol';
import { operationPresentation } from './operation';

function event(action: string, position?: WindEvent['position']): WindEvent {
  return {
    id: action,
    source: action.startsWith('pump_') ? 'pump' : 'fomo',
    action,
    occurredAt: '2026-08-31T08:00:00.000Z',
    receivedAt: '2026-08-31T08:00:00.100Z',
    title: action,
    importance: 'normal',
    position,
  };
}

describe('operationPresentation', () => {
  it.each([
    ['first', '买入 · 首次'],
    ['reenter', '买入 · 再建仓'],
    ['add', '买入 · 加仓'],
  ] as const)('labels a %s position sequence', (sequence, label) => {
    expect(operationPresentation(event('pump_buy', { sequence }))).toEqual({
      label,
      tone: 'buy',
    });
  });

  it('distinguishes partial exits, rounded percentages, and full exits', () => {
    expect(operationPresentation(event('fomo_sell', { percent: 17.2 })).label).toBe(
      '卖出 · 17%',
    );
    expect(operationPresentation(event('fomo_sell', { percent: 6.25 })).label).toBe(
      '卖出 · 6.3%',
    );
    expect(operationPresentation(event('fomo_sell', { percent: 99.6 })).label).toBe(
      '卖出 · 100%',
    );
    expect(operationPresentation(event('fomo_sell', { closed: true })).label).toBe(
      '卖出 · 清仓',
    );
  });

  it('does not invent a position detail when structured metadata is absent', () => {
    expect(operationPresentation(event('pump_sell'))).toEqual({
      label: '卖出',
      tone: 'sell',
    });
  });

  it('keeps non-trade actions distinct', () => {
    expect(operationPresentation(event('fomo_thesis'))).toEqual({
      label: '观点',
      tone: 'view',
    });
    expect(operationPresentation(event('fomo_consensus'))).toEqual({
      label: '共识',
      tone: 'consensus',
    });
    expect(operationPresentation(event('fomo_swap'))).toEqual({
      label: '换仓',
      tone: 'neutral',
    });
  });
});
