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

  it('keeps the original X post for replies', () => {
    const event = parseWindEvent({
      type: 'event',
      event: {
        seq: 993,
        platform: 'x',
        handle: 'elonmusk',
        action: 'reply',
        payload: {
          author_name: 'Elon Musk',
          content_text: 'When is Diablo V?',
          reference_text: 'BLIZZCON MONTH! I will be there, streaming on-site.',
          reference_translation: { text: '暴雪嘉年华月！我会在现场直播。' },
          reference_author_handle: 'wudijo',
          reference_author_name: 'wudijo',
          reference_author_avatar: '/api/tgmedia/wudijo.jpg',
          reference_media: [
            { type: 'photo', url: '/api/tgmedia/blizzcon.jpg' },
            { type: 'video', url: 'https://video.example.com/a.mp4', poster: '/api/tgmedia/poster.jpg' },
          ],
        },
      },
    });

    expect(event?.reference).toEqual({
      kind: 'reply',
      author: 'wudijo',
      authorHandle: 'wudijo',
      avatarUrl: 'https://wind.jokkimon.club/api/tgmedia/wudijo.jpg',
      text: 'BLIZZCON MONTH! I will be there, streaming on-site.',
      translation: '暴雪嘉年华月！我会在现场直播。',
      media: [
        { type: 'photo', url: 'https://wind.jokkimon.club/api/tgmedia/blizzcon.jpg' },
        {
          type: 'video',
          url: 'https://video.example.com/a.mp4',
          posterUrl: 'https://wind.jokkimon.club/api/tgmedia/poster.jpg',
        },
      ],
    });
  });

  it('keeps reference context when a quote or repost has no standalone body', () => {
    const quote = parseWindEvent({
      type: 'event',
      event: {
        seq: 1021939,
        platform: 'x',
        handle: 'vladtenev',
        action: 'quote',
        payload: {
          content_text: 'I have always liked the idea that becoming an owner is social.',
          reference_text: 'Investing is better with friends.',
          reference_author_handle: 'RobinhoodApp',
          reference_author_name: 'Robinhood',
          reference_media: [
            {
              type: 'video',
              poster: 'https://pbs.twimg.com/amplify_video_thumb/example.jpg',
              url: 'https://video.twimg.com/amplify_video/example.mp4',
            },
          ],
        },
      },
    });
    const repost = parseWindEvent({
      type: 'event',
      event: {
        seq: 1020818,
        platform: 'x',
        handle: 'blknoiz06',
        action: 'repost',
        payload: {
          content_text: '',
          reference_text: "nah i know who did and it's not u vlad\n\n$ANSEM",
          reference_author_handle: '0xaman_',
          reference_author_name: 'Aman',
          reference_media: [{ type: 'image', url: 'https://pbs.twimg.com/media/example.jpg' }],
        },
      },
    });

    expect(quote?.reference).toMatchObject({
      kind: 'quote',
      author: 'Robinhood',
      authorHandle: 'RobinhoodApp',
      media: [{ posterUrl: 'https://pbs.twimg.com/amplify_video_thumb/example.jpg' }],
    });
    expect(repost).toMatchObject({
      title: '转发新动态',
      reference: {
        kind: 'repost',
        author: 'Aman',
        authorHandle: '0xaman_',
        text: "nah i know who did and it's not u vlad\n\n$ANSEM",
      },
    });
  });

  it('keeps the target profile for X follow activity events', () => {
    const event = parseWindEvent({
      type: 'event_update',
      event: {
        seq: 994,
        platform: 'x',
        handle: 'ansem',
        action: 'follow',
        payload: {
          author_name: 'Ansem',
          content_text: '',
          target: {
            name: 'Market Structure',
            handle: 'marketstructure',
            avatar: '/api/tgmedia/marketstructure.jpg',
            banner: '/api/tgmedia/marketstructure-banner.jpg',
            bio: 'On-chain research and liquidity analysis.',
            bio_translation: { text: '链上研究与流动性分析。' },
            followers: 128400,
            following: 742,
            verified: true,
          },
        },
      },
    });

    expect(event).toMatchObject({
      action: 'follow',
      title: '关注账号',
      importance: 'high',
      target: {
        name: 'Market Structure',
        handle: 'marketstructure',
        avatarUrl: 'https://wind.jokkimon.club/api/tgmedia/marketstructure.jpg',
        bannerUrl: 'https://wind.jokkimon.club/api/tgmedia/marketstructure-banner.jpg',
        bio: 'On-chain research and liquidity analysis.',
        bioTranslation: '链上研究与流动性分析。',
        followers: 128400,
        following: 742,
        verified: true,
        profileUrl: 'https://x.com/marketstructure',
      },
      sourceUrl: 'https://x.com/marketstructure',
    });
  });

  it('separates trade-time metrics from the current ca_info quote', () => {
    const event = parseWindEvent({
      type: 'event',
      event: {
        seq: 995,
        platform: 'fomo',
        handle: 'frankdegods',
        action: 'fomo_buy',
        payload: {
          content_text: '买入 QC ≈$5.0K · 2.3M @ $0.0022 · Robinhood · ws',
          ca_info: [
            {
              address: '0xa802332f6c9daf2146a61c51876d180b1a4a9901',
              resolved_chain: 'robinhood',
              symbol: 'QC',
              mc: 1_044_833.5,
              vol24h: 1_014_060.001,
              price: 0.0010448335,
            },
          ],
          extra: {
            fomo: {
              usd: 4997.547526,
              amount: 2_257_482.58756,
              price: 0.0022137701,
              mcap: 1_971_859.0223,
              cash_symbol: 'USDC',
              route: 'Robinhood→Solana',
              via: 'ws',
            },
          },
        },
      },
    });

    expect(event).toMatchObject({
      amountUsd: 4997.547526,
      trade: {
        tokenAmount: 2_257_482.58756,
        priceUsd: 0.0022137701,
        marketCapUsd: 1_971_859.0223,
        cashSymbol: 'USDC',
        route: 'Robinhood→Solana',
        venue: 'ws',
      },
      token: {
        quote: {
          marketCapUsd: 1_044_833.5,
          volume24hUsd: 1_014_060.001,
          priceUsd: 0.0010448335,
        },
      },
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

  it('keeps normalized quote, trade, reference, and target data in storage migrations', () => {
    const event = parseWindEvent({
      id: 'persisted-rich-event',
      source: 'x',
      action: 'quote',
      occurredAt: '2026-08-31T08:00:00.000Z',
      receivedAt: '2026-08-31T08:00:00.120Z',
      title: '引用动态',
      amountUsd: 2500,
      trade: { tokenAmount: 1_000_000, priceUsd: 0.0025, marketCapUsd: 2_500_000 },
      token: {
        chain: 'base',
        address: '0x1111111111111111111111111111111111111111',
        symbol: 'RICH',
        quote: { marketCapUsd: 2_800_000, volume24hUsd: 900_000, priceUsd: 0.0028 },
      },
      reference: {
        kind: 'quote',
        author: 'Original Author',
        authorHandle: 'original',
        text: 'Original post',
        media: [],
      },
      target: {
        name: 'Target',
        handle: 'target',
        followers: 1000,
      },
    });

    expect(event).toMatchObject({
      trade: { tokenAmount: 1_000_000, priceUsd: 0.0025, marketCapUsd: 2_500_000 },
      token: {
        quote: { marketCapUsd: 2_800_000, volume24hUsd: 900_000, priceUsd: 0.0028 },
      },
      reference: {
        kind: 'quote',
        author: 'Original Author',
        authorHandle: 'original',
        text: 'Original post',
        media: [],
      },
      target: { name: 'Target', handle: 'target', followers: 1000 },
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

  it('normalizes optional Sub2API settings without storing a key in config', () => {
    const normalized = normalizeStreamConfig({
      sub2ApiBaseUrl: '  https://sub2api.example.com/v1  ',
      grokModel: '  grok-4.6  ',
      grokApiKey: 'must-not-enter-stream-config',
    });

    expect(normalized.sub2ApiBaseUrl).toBe('https://sub2api.example.com/v1');
    expect(normalized.grokModel).toBe('grok-4.6');
    expect(normalized).not.toHaveProperty('grokApiKey');
  });
});
