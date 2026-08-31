import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  normalizeStreamConfig,
  parseWindEvent,
  parseWindHistory,
} from './protocol';

describe('parseWindEvent', () => {
  it('accepts an event envelope and keeps a valid token target', () => {
    const event = parseWindEvent({
      type: 'event',
      event: {
        id: 'evt-7',
        sequence: 7,
        source: 'telegram',
        occurredAt: '2026-08-31T08:00:00.000Z',
        receivedAt: '2026-08-31T08:00:00.120Z',
        title: '发现新标的',
        token: { chain: 'sol', address: 'CA123', symbol: 'WIND' },
      },
    });

    expect(event?.source).toBe('telegram');
    expect(event?.token).toEqual({ chain: 'sol', address: 'CA123', symbol: 'WIND' });
    expect(event?.importance).toBe('normal');
  });

  it('rejects messages without an id or title', () => {
    expect(parseWindEvent({ type: 'pong' })).toBeNull();
    expect(parseWindEvent({ id: 'evt-8' })).toBeNull();
  });

  it('drops executable source links from gateway payloads', () => {
    expect(
      parseWindEvent({
        id: 'evt-9',
        title: '消息',
        sourceUrl: 'javascript:alert(1)',
      })?.sourceUrl,
    ).toBeUndefined();
  });

  it('maps a native wind /ws event and extracts its trading target', () => {
    const now = new Date('2026-08-31T08:00:01.000Z');
    const event = parseWindEvent(
      {
        type: 'event',
        event: {
          seq: 991,
          platform: 'fomo',
          handle: 'smart-wallet',
          action: 'fomo_buy',
          ts: 1788163200000,
          payload: {
            author_name: 'Smart Wallet',
            avatar_url: '/api/tgmedia/avatar_fomo_smart-wallet.jpg',
            content_text: '买入一枚新币',
            extra: {
              fomo: {
                ca: 'So11111111111111111111111111111111111111112',
                chain: 'solana',
                symbol: 'WIND',
                tx_url: 'https://solscan.io/tx/example',
              },
            },
          },
        },
      },
      now,
    );

    expect(event).toMatchObject({
      id: '991',
      sequence: 991,
      source: 'fomo',
      action: 'fomo_buy',
      author: 'Smart Wallet',
      avatarUrl: 'https://wind.jokkimon.club/api/tgmedia/avatar_fomo_smart-wallet.jpg',
      title: '买入一枚新币',
      importance: 'urgent',
      token: {
        chain: 'sol',
        address: 'So11111111111111111111111111111111111111112',
        symbol: 'WIND',
      },
      sourceUrl: 'https://solscan.io/tx/example',
      receivedAt: now.toISOString(),
    });
  });

  it('uses ca_info before text heuristics for native events', () => {
    const event = parseWindEvent({
      type: 'event_update',
      event: {
        seq: 992,
        platform: 'pumpfun',
        action: 'pump_callout',
        payload: {
          content_text: '新喊单',
          ca_info: [
            {
              address: '0x1111111111111111111111111111111111111111',
              resolved_chain: 'base',
              symbol: 'BASE',
            },
          ],
        },
      },
    });

    expect(event?.source).toBe('pump');
    expect(event?.token).toEqual({
      chain: 'base',
      address: '0x1111111111111111111111111111111111111111',
      symbol: 'BASE',
      name: undefined,
      imageUrl: undefined,
    });
  });

  it('parses the observed Robinhood fomo_buy frame', () => {
    const event = parseWindEvent({
      type: 'event',
      event: {
        seq: 869146,
        platform: 'fomo',
        handle: 'change',
        tweet_id: 'fomo:oc:transaction:token:in',
        action: 'fomo_buy',
        ts: 1788165233000,
        payload: {
          platform: 'fomo',
          handle: 'change',
          author_name: 'change',
          action: 'fomo_buy',
          content_text: '买入 MANCER ≈$50 · 516.4K @ $0.0038 · Robinhood · 链上',
          ca_info: [
            {
              chain: 'evm',
              address: '0xc72f232a6869e6cf34dc06129affd07f8a2a246a',
              symbol: 'MANCER',
              resolved_chain: 'robinhood',
            },
          ],
          extra: {
            fomo: {
              ca: '0xc72f232a6869e6cf34dc06129affd07f8a2a246a',
              chain: 'Robinhood',
              symbol: 'MANCER',
              tx_url: 'https://example.com/tx/example',
            },
          },
        },
      },
    });

    expect(event).toMatchObject({
      id: '869146',
      source: 'fomo',
      author: 'change',
      title: '买入 MANCER ≈$50 · 516.4K @ $0.0038 · Robinhood · 链上',
      importance: 'urgent',
      token: {
        chain: 'robinhood',
        address: '0xc72f232a6869e6cf34dc06129affd07f8a2a246a',
        symbol: 'MANCER',
      },
    });
  });

  it('parses the observed pump_update frame and structured translation', () => {
    const event = parseWindEvent({
      type: 'event',
      event: {
        seq: 869465,
        platform: 'pumpfun',
        handle: 'asilaydying0718',
        tweet_id: 'pump:update:b0795971-b64a-4413-b925-a0529f4f0620',
        action: 'pump_update',
        ts: 1788165827000,
        payload: {
          author_name: 'asilaydying0718',
          content_text: 'He already claimed fees and you jeeting af',
          translation: { text: '他已经索要费用了，你就离开吧', lang: 'en' },
          tweet_url:
            'https://pump.fun/callouts/5QUf78bnfJPqPRyMsHfE51Qv7hEKx6yGB2CGUYU3BrUq/example',
          ca_info: [
            {
              chain: 'solana',
              address: '5QUf78bnfJPqPRyMsHfE51Qv7hEKx6yGB2CGUYU3BrUq',
              symbol: 'BUDDY',
              resolved_chain: 'sol',
            },
          ],
          extra: {
            pump: {
              chain_slug: 'sol',
              mint: '5QUf78bnfJPqPRyMsHfE51Qv7hEKx6yGB2CGUYU3BrUq',
              symbol: 'BUDDY',
              name: 'Voxel Buddies',
            },
          },
        },
      },
    });

    expect(event).toMatchObject({
      id: '869465',
      source: 'pump',
      author: 'asilaydying0718',
      title: 'He already claimed fees and you jeeting af',
      body: '他已经索要费用了，你就离开吧',
      importance: 'high',
      token: {
        chain: 'sol',
        address: '5QUf78bnfJPqPRyMsHfE51Qv7hEKx6yGB2CGUYU3BrUq',
        symbol: 'BUDDY',
        name: 'Voxel Buddies',
      },
    });
  });

  it('parses the observed pump_sell frame', () => {
    const event = parseWindEvent({
      type: 'event',
      event: {
        seq: 869489,
        platform: 'pumpfun',
        handle: 'asilaydying0718',
        tweet_id: 'pump:trade:example',
        action: 'pump_sell',
        ts: 1788165854000,
        payload: {
          author_name: 'asilaydying0718',
          content_text: '$BUDDY',
          ca_info: [
            {
              chain: 'solana',
              address: '5QUf78bnfJPqPRyMsHfE51Qv7hEKx6yGB2CGUYU3BrUq',
              symbol: 'BUDDY',
              resolved_chain: 'sol',
            },
          ],
          extra: {
            pump: {
              kind: 'sell',
              status: 'success',
              chain_slug: 'sol',
              mint: '5QUf78bnfJPqPRyMsHfE51Qv7hEKx6yGB2CGUYU3BrUq',
              symbol: 'BUDDY',
              name: 'Voxel Buddies',
              amount_usd: 5.63522852010262,
              tx_url: 'https://solscan.io/tx/example',
            },
          },
        },
      },
    });

    expect(event).toMatchObject({
      id: '869489',
      source: 'pump',
      authorHandle: 'asilaydying0718',
      title: '$BUDDY',
      amountUsd: 5.63522852010262,
      importance: 'urgent',
      token: {
        chain: 'sol',
        address: '5QUf78bnfJPqPRyMsHfE51Qv7hEKx6yGB2CGUYU3BrUq',
        symbol: 'BUDDY',
        name: 'Voxel Buddies',
      },
      sourceUrl: 'https://solscan.io/tx/example',
    });
  });

  it('parses the observed BSC fomo_buy diagnostic frame', () => {
    const event = parseWindEvent({
      type: 'event',
      event: {
        seq: 869902,
        platform: 'fomo',
        handle: 'ed_x0101',
        action: 'fomo_buy',
        ts: 1788166598000,
        payload: {
          author_name: 'Ed_x0101',
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
              ca: '0xf090a835eccfa66f514344ffcb01b275ea997777',
              chain: 'BNB',
              symbol: '玩偶兔子',
            },
          },
        },
      },
    });

    expect(event).toMatchObject({
      id: '869902',
      source: 'fomo',
      author: 'Ed_x0101',
      authorHandle: 'ed_x0101',
      title: '买入 玩偶兔子 ≈$300 · 473.6K @ $0.0006 · BNB',
      importance: 'urgent',
      token: {
        chain: 'bsc',
        address: '0xf090a835eccfa66f514344ffcb01b275ea997777',
        symbol: '玩偶兔子',
      },
    });
  });

  it('keeps Pump trades separate from chain events and extracts the USD amount', () => {
    const event = parseWindEvent({
      type: 'event',
      event: {
        seq: 869901,
        platform: 'pumpfun',
        handle: 'hexiecs',
        action: 'pump_buy',
        ts: 1788166597000,
        payload: {
          author_name: 'hexiecs',
          content_text: '$CINEMA',
          ca_info: [
            {
              chain: 'evm',
              address: '0x9936403a9cc72cf306063e3496ea387428a3aecd',
              symbol: 'CINEMA',
              resolved_chain: 'robinhood',
            },
          ],
          extra: {
            pump: {
              kind: 'buy',
              amount_usd: 5_000,
              symbol: 'CINEMA',
              mint: '0x9936403a9cc72cf306063e3496ea387428a3aecd',
              chain: 'robinhood',
              pos: { seq: 'add' },
            },
          },
        },
      },
    });

    expect(event).toMatchObject({
      id: '869901',
      source: 'pump',
      action: 'pump_buy',
      authorHandle: 'hexiecs',
      title: '$CINEMA',
      amountUsd: 5_000,
      position: { sequence: 'add', percent: undefined, closed: undefined },
      token: {
        chain: 'robinhood',
        address: '0x9936403a9cc72cf306063e3496ea387428a3aecd',
        symbol: 'CINEMA',
      },
    });
  });

  it('parses the observed Fomo add-position frame', () => {
    const event = parseWindEvent({
      type: 'event',
      event: {
        seq: 880140,
        platform: 'fomo',
        handle: 'frankdegods',
        action: 'fomo_buy',
        payload: {
          content_text: '买入 QC ≈$5.0K · 2.3M @ $0.0022 · Robinhood · ws',
          extra: {
            fomo: {
              usd: 4997.547526,
              symbol: 'QC',
              closed: false,
              pos: { seq: 'add', pct: null, closed: false },
            },
          },
        },
      },
    });

    expect(event).toMatchObject({
      id: '880140',
      source: 'fomo',
      action: 'fomo_buy',
      amountUsd: 4997.547526,
      position: { sequence: 'add', closed: false },
    });
  });

  it('uses Fomo pos.closed over a conflicting top-level closed flag', () => {
    const event = parseWindEvent({
      type: 'event_update',
      event: {
        seq: 880115,
        platform: 'fomo',
        handle: 'frankdegods',
        action: 'fomo_sell',
        payload: {
          content_text: '卖出 CINEMA ≈$10.1K · 2.8M @ $0.0036 · Robinhood',
          extra: {
            fomo: {
              usd: 10084.933333,
              symbol: 'CINEMA',
              closed: false,
              pos: { seq: null, pct: null, closed: true },
            },
          },
        },
      },
    });

    expect(event).toMatchObject({
      id: '880115',
      source: 'fomo',
      action: 'fomo_sell',
      amountUsd: 10084.933333,
      position: { closed: true },
    });
  });

  it('keeps normalized position metadata in session storage migrations', () => {
    const event = parseWindEvent({
      id: 'persisted-fomo-sell',
      source: 'fomo',
      action: 'fomo_sell',
      occurredAt: '2026-08-31T08:00:00.000Z',
      receivedAt: '2026-08-31T08:00:00.120Z',
      title: '卖出 CINEMA',
      position: { percent: '17%' },
    });

    expect(event?.position).toEqual({
      sequence: undefined,
      percent: 17,
      closed: undefined,
    });
  });

  it('reclassifies persisted Pump events and keeps their normalized USD amount', () => {
    const event = parseWindEvent({
      id: 'persisted-pump-sell',
      source: 'chain',
      action: 'pump_sell',
      occurredAt: '2026-08-31T08:00:00.000Z',
      receivedAt: '2026-08-31T08:00:00.120Z',
      title: '$CINEMA',
      amountUsd: '$13.7K',
    });

    expect(event).toMatchObject({
      source: 'pump',
      action: 'pump_sell',
      amountUsd: 13_700,
    });
  });

  it('normalizes a fomo consensus frame into summary metrics and participants', () => {
    const event = parseWindEvent({
      type: 'event',
      event: {
        seq: 875426,
        platform: 'fomo',
        handle: 'consensus',
        action: 'fomo_consensus',
        ts: 1788174249000,
        payload: {
          author_name: '共识',
          content_text:
            '共识买入 CINEMA · 8人/30min · 共≈$79.1K {smol_intern $20.0K · edwin999 $13.6K}',
          ca_info: [
            {
              chain: 'evm',
              address: '0x9936403a9cc72cf306063e3496ea387428a3aecd',
              symbol: 'CINEMA',
              resolved_chain: 'robinhood',
            },
          ],
          extra: {
            fomo: {
              ca: '0x9936403a9cc72cf306063e3496ea387428a3aecd',
              chain: 'Robinhood',
              symbol: 'CINEMA',
              consensus: {
                n: 8,
                window_min: 30,
                total_usd: 79_100,
                entities: [
                  { label: 'smol_intern', usd: 20_000, platform: 'fomo' },
                  { label: 'edwin999', usd: '$13.6K', platform: 'pumpfun' },
                ],
              },
            },
          },
        },
      },
    });

    expect(event).toMatchObject({
      id: '875426',
      action: 'fomo_consensus',
      title: '共识买入 $CINEMA',
      body: undefined,
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
          { label: 'edwin999', usd: 13_600, platform: 'pumpfun' },
        ],
      },
    });
  });

  it('parses, deduplicates, and orders the REST history snapshot', () => {
    const history = parseWindHistory(
      {
        feed: {
          events: [
            {
              seq: 41,
              platform: 'x',
              action: 'tweet',
              ts: 1788163200000,
              payload: { author_name: 'older', content_text: 'Older event' },
            },
            {
              seq: 42,
              platform: 'fomo',
              action: 'fomo_buy',
              ts: 1788163201000,
              payload: {
                author_name: 'newer',
                content_text: 'Newer event',
                latency_ms: 250,
              },
            },
          ],
        },
        activities: {
          events: [
            {
              seq: 41,
              platform: 'x',
              action: 'tweet',
              ts: 1788163200000,
              payload: { author_name: 'duplicate', content_text: 'Duplicate event' },
            },
          ],
        },
      },
      new Date('2026-08-31T08:00:10.000Z'),
    );

    expect(history.map((event) => event.id)).toEqual(['42', '41']);
    expect(history[0]).toMatchObject({
      title: 'Newer event',
      receivedAt: new Date(1788163201250).toISOString(),
    });
    expect(history[1].receivedAt).toBe(history[1].occurredAt);
  });
});

describe('stream config', () => {
  it('uses safe defaults for malformed stored values', () => {
    expect(normalizeStreamConfig(null)).toEqual(DEFAULT_CONFIG);
  });

  it('ignores obsolete gateway and single-target trading settings', () => {
    expect(
      normalizeStreamConfig({
        websocketUrl: 'wss://old.example/ws',
        accessToken: 'secret',
        tradingUrlTemplate: 'https://trade.example/{address}',
        debotUrlTemplate: 'https://debot.example/{chain}/{address}',
        gmgnUrlTemplate: 'https://gmgn.example/{chain}/{address}',
      }),
    ).toEqual({
      ...DEFAULT_CONFIG,
      debotUrlTemplate: 'https://debot.example/{chain}/{address}',
      gmgnUrlTemplate: 'https://gmgn.example/{chain}/{address}',
    });
  });

  it('normalizes supported theme preferences and rejects unknown values', () => {
    expect(normalizeStreamConfig({ theme: 'dark' }).theme).toBe('dark');
    expect(normalizeStreamConfig({ theme: 'light' }).theme).toBe('light');
    expect(normalizeStreamConfig({ theme: 'system' }).theme).toBe('system');
    expect(normalizeStreamConfig({ theme: 'midnight' }).theme).toBe(DEFAULT_CONFIG.theme);
  });
});
