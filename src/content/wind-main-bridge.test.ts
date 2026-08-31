import { afterEach, describe, expect, it, vi } from 'vitest';

class FakeWebSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly url: string;

  constructor(url: string) {
    super();
    this.url = url;
  }
}

describe('Wind MAIN world WebSocket bridge', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('forwards frames from the official Wind socket without opening another socket', async () => {
    const postMessage = vi.fn();
    vi.stubGlobal('window', {
      location: {
        href: 'https://wind.jokkimon.club/',
        origin: 'https://wind.jokkimon.club',
      },
      WebSocket: FakeWebSocket,
      postMessage,
    });

    await import('./wind-main-bridge');

    const socket = new window.WebSocket('wss://wind.jokkimon.club/ws');
    socket.dispatchEvent(
      new MessageEvent('message', {
        data: '{"type":"hello_ok","mode":"user","watch_count":44}',
      }),
    );

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'frame',
        raw: '{"type":"hello_ok","mode":"user","watch_count":44}',
      }),
      'https://wind.jokkimon.club',
    );
  });

  it('publishes REST history before buffered WebSocket event increments', async () => {
    const postMessage = vi.fn();
    const pending = new Map<string, (response: unknown) => void>();
    const fetch = vi.fn(
      (path: string) =>
        new Promise((resolve) => {
          pending.set(path, resolve);
        }),
    );
    vi.stubGlobal('window', {
      location: {
        href: 'https://wind.jokkimon.club/',
        origin: 'https://wind.jokkimon.club',
      },
      WebSocket: FakeWebSocket,
      fetch,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      postMessage,
    });

    await import('./wind-main-bridge');

    const socket = new window.WebSocket('wss://wind.jokkimon.club/ws');
    socket.dispatchEvent(
      new MessageEvent('message', {
        data: '{"type":"event","event":{"seq":43}}',
      }),
    );

    expect(postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'frame' }),
      expect.anything(),
    );

    for (const resolve of pending.values()) {
      resolve({
        ok: true,
        status: 200,
        json: async () => ({ events: [] }),
      });
    }

    await vi.waitFor(() => {
      const kinds = postMessage.mock.calls.map(([message]) => message.kind);
      expect(kinds).toContain('history');
      expect(kinds.indexOf('history')).toBeLessThan(kinds.indexOf('frame'));
    });
  });
});
