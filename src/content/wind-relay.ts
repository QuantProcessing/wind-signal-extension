(() => {
const BRIDGE_MARKER = '__wind_realtime_extension_bridge_v1__';
const WIND_ORIGIN = 'https://wind.jokkimon.club';
const HEARTBEAT_MS = 5_000;

type SocketState = 'waiting' | 'open' | 'closed' | 'error';

interface RelayStatus {
  socketState: SocketState;
  lastHello: string | null;
  lastFrameAt: string | null;
}

let socketState: SocketState = 'waiting';
let lastHello: string | null = null;
let lastFrameAt: string | null = null;

function relayStatus(): RelayStatus {
  return { socketState, lastHello, lastFrameAt };
}

function send(message: Record<string, unknown>): void {
  void chrome.runtime.sendMessage(message).catch(() => undefined);
}

function announce(type: 'wind-relay:ready' | 'wind-relay:heartbeat'): void {
  send({ type, ...relayStatus() });
}

function noteHello(raw: string): void {
  try {
    const message = JSON.parse(raw) as { type?: unknown };
    if (message?.type === 'hello_ok') lastHello = raw;
  } catch {
    // The background owns full protocol parsing. This only preserves hello_ok
    // so a restarted MV3 Service Worker can recover the authenticated mode.
  }
}

window.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (event.source !== window || event.origin !== WIND_ORIGIN) return;
  if (!event.data || typeof event.data !== 'object') return;

  const message = event.data as Record<string, unknown>;
  if (message[BRIDGE_MARKER] !== true || typeof message.kind !== 'string') return;

  switch (message.kind) {
    case 'bridge-installed':
      socketState = 'waiting';
      announce('wind-relay:ready');
      break;
    case 'socket-open':
      socketState = 'open';
      send({ type: 'wind-relay:state', state: 'socket-open' });
      break;
    case 'socket-close':
      socketState = 'closed';
      send({
        type: 'wind-relay:state',
        state: 'socket-close',
        code: typeof message.code === 'number' ? message.code : 0,
        reason: typeof message.reason === 'string' ? message.reason : '',
      });
      break;
    case 'socket-error':
      socketState = 'error';
      send({ type: 'wind-relay:state', state: 'socket-error' });
      break;
    case 'frame':
      if (typeof message.raw !== 'string') return;
      lastFrameAt = new Date().toISOString();
      noteHello(message.raw);
      send({ type: 'wind-relay:frame', raw: message.raw });
      break;
    case 'history':
      if (typeof message.raw !== 'string') return;
      send({ type: 'wind-relay:history', raw: message.raw });
      break;
    case 'history-error':
      send({
        type: 'wind-relay:history-error',
        error: typeof message.error === 'string' ? message.error : 'unknown error',
      });
      break;
  }
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (
    message &&
    typeof message === 'object' &&
    (message as Record<string, unknown>).type === 'wind-relay:probe'
  ) {
    sendResponse({ ok: true, ...relayStatus() });
  }
});

announce('wind-relay:ready');
window.setInterval(() => announce('wind-relay:heartbeat'), HEARTBEAT_MS);
})();
