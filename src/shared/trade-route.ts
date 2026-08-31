import type { TokenRef, TradeTarget } from './protocol';

const PLACEHOLDERS = ['chain', 'address', 'symbol'] as const;

export function buildTradeUrl(template: string, token: TokenRef): string {
  let result = template.trim();
  const values: Record<(typeof PLACEHOLDERS)[number], string> = {
    chain: token.chain,
    address: token.address,
    symbol: token.symbol ?? '',
  };

  for (const placeholder of PLACEHOLDERS) {
    result = result.replaceAll(`{${placeholder}}`, encodeURIComponent(values[placeholder]));
  }

  if (result.includes('{')) {
    throw new Error('交易链接包含未支持的占位符');
  }

  const url = new URL(result);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('交易链接必须使用 http 或 https');
  }
  return url.toString();
}

export function chainForTradeTarget(target: TradeTarget, token: TokenRef): string {
  const chain = token.chain.trim().toLowerCase();
  if (chain === 'sol' || chain === 'solana') return target === 'debot' ? 'solana' : 'sol';
  if (chain === 'bnb' || chain === 'binance' || chain === 'bsc') return 'bsc';
  if (chain === 'ethereum' || chain === 'eth') return 'eth';
  if (chain === 'base') return 'base';
  if (chain === 'robinhood') return 'robinhood';
  if (chain === 'evm') {
    return token.address.startsWith('0x') ? 'eth' : target === 'debot' ? 'solana' : 'sol';
  }
  return chain;
}

export function buildTargetTradeUrl(
  target: TradeTarget,
  template: string,
  token: TokenRef,
): string {
  return buildTradeUrl(template, {
    ...token,
    chain: chainForTradeTarget(target, token),
  });
}

export function hostForTradeUrl(value: string): string {
  return new URL(value).host;
}
