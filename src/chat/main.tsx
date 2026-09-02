import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fira-code';
import '@fontsource-variable/noto-sans-sc';
import { GrokWorkspace } from '../grok/GrokWorkspace';
import {
  DEFAULT_CONFIG,
  STORAGE_KEYS,
  normalizeStreamConfig,
  type GrokChatContext,
  type RuntimeSnapshot,
  type StreamConfig,
} from '../shared/protocol';
import { normalizeGrokChatContext } from '../shared/grok-history';
import '../sidepanel/styles.css';

const isExtension = typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
type CommandResponse<T> = { ok: true; result: T } | { ok: false; error: string };

function initialContext(): GrokChatContext | undefined {
  const raw = new URLSearchParams(window.location.search).get('context');
  if (!raw) return undefined;
  try {
    return normalizeGrokChatContext(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function useTheme(preference: StreamConfig['theme']): void {
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setSystemDark(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    const theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [preference, systemDark]);
}

function ChatWindow() {
  const [config, setConfig] = useState<StreamConfig>(
    isExtension
      ? DEFAULT_CONFIG
      : { ...DEFAULT_CONFIG, sub2ApiBaseUrl: 'http://preview.local' },
  );
  const [error, setError] = useState<string | null>(null);
  useTheme(config.theme);

  useEffect(() => {
    if (!isExtension) return;
    void chrome.runtime
      .sendMessage({ type: 'snapshot:get' })
      .then((response: CommandResponse<RuntimeSnapshot>) => {
        if (!response.ok) throw new Error(response.error);
        setConfig(response.result.config);
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      );

    const handleChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[STORAGE_KEYS.config]) {
        setConfig(normalizeStreamConfig(changes[STORAGE_KEYS.config].newValue));
      }
    };
    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, []);

  return (
    <>
      <GrokWorkspace config={config} context={initialContext()} mode="window" />
      {error && <div className="toast">{error}</div>}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<ChatWindow />);
