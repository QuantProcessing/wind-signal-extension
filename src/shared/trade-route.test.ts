import { describe, expect, it } from 'vitest';
import {
  buildTargetTradeUrl,
  buildTradeUrl,
  chainForTradeTarget,
  hostForTradeUrl,
} from './trade-route';

describe('buildTradeUrl', () => {
  it('interpolates and encodes token placeholders', () => {
    expect(
      buildTradeUrl('https://trade.example/{chain}/token/{address}?s={symbol}', {
        chain: 'sol',
        address: 'A/B',
        symbol: 'W IND',
      }),
    ).toBe('https://trade.example/sol/token/A%2FB?s=W%20IND');
  });

  it('rejects executable and unknown templates', () => {
    expect(() =>
      buildTradeUrl('javascript:alert({address})', { chain: 'sol', address: 'CA' }),
    ).toThrow();
    expect(() =>
      buildTradeUrl('https://trade.example/{network}/{address}', {
        chain: 'sol',
        address: 'CA',
      }),
    ).toThrow('占位符');
  });

  it('extracts the trading host used for tab reuse', () => {
    expect(hostForTradeUrl('https://trade.example/sol/CA')).toBe('trade.example');
  });

  it('uses each trading platform chain slug and token page format', () => {
    const token = { chain: 'sol', address: 'A/B', symbol: 'WIND' };
    expect(chainForTradeTarget('debot', token)).toBe('solana');
    expect(chainForTradeTarget('gmgn', token)).toBe('sol');
    expect(
      buildTargetTradeUrl('debot', 'https://debot.ai/token/{chain}/{address}', token),
    ).toBe('https://debot.ai/token/solana/A%2FB');
    expect(
      buildTargetTradeUrl('gmgn', 'https://gmgn.ai/{chain}/token/{address}', token),
    ).toBe('https://gmgn.ai/sol/token/A%2FB');
  });

  it('supports SOL, ETH, Robinhood, Base, and BSC on both targets', () => {
    const address = '0x1111111111111111111111111111111111111111';
    expect(chainForTradeTarget('debot', { chain: 'sol', address })).toBe('solana');
    expect(chainForTradeTarget('gmgn', { chain: 'sol', address })).toBe('sol');
    for (const chain of ['eth', 'robinhood', 'base', 'bsc']) {
      expect(chainForTradeTarget('debot', { chain, address })).toBe(chain);
      expect(chainForTradeTarget('gmgn', { chain, address })).toBe(chain);
    }
    expect(
      chainForTradeTarget('debot', {
        chain: 'bnb',
        address,
      }),
    ).toBe('bsc');
  });
});
