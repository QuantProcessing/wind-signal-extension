function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseSub2ApiBaseUrl(value: string): URL {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('请先填写 Sub2API 地址');

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Sub2API 地址格式不正确');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Sub2API 地址只支持 http 或 https');
  }
  if (url.username || url.password) {
    throw new Error('Sub2API 地址中不能包含账号或密码');
  }
  return url;
}

export function buildSub2ApiResponsesUrl(value: string): string {
  const url = parseSub2ApiBaseUrl(value);
  const path = url.pathname.replace(/\/+$/, '');
  if (path.endsWith('/responses')) url.pathname = path;
  else if (path.endsWith('/v1')) url.pathname = `${path}/responses`;
  else url.pathname = `${path}/v1/responses`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function sub2ApiPermissionPattern(value: string): string {
  return `${parseSub2ApiBaseUrl(value).origin}/*`;
}

function collectCitationUrls(value: unknown, urls: Set<string>, depth = 0): void {
  if (depth > 8 || value == null) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectCitationUrls(item, urls, depth + 1));
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, item] of Object.entries(value)) {
    if ((key === 'url' || key === 'uri') && typeof item === 'string') {
      try {
        const parsed = new URL(item);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') urls.add(parsed.toString());
      } catch {
        // Ignore malformed citation metadata.
      }
    } else {
      collectCitationUrls(item, urls, depth + 1);
    }
  }
}

export function parseGrokResponse(value: unknown): { text: string; citations: string[] } {
  if (!isRecord(value)) throw new Error('Sub2API 返回了无法识别的数据');

  let text = typeof value.output_text === 'string' ? value.output_text.trim() : '';
  if (!text && Array.isArray(value.output)) {
    const chunks: string[] = [];
    for (const item of value.output) {
      if (!isRecord(item) || !Array.isArray(item.content)) continue;
      for (const content of item.content) {
        if (isRecord(content) && typeof content.text === 'string') chunks.push(content.text);
      }
    }
    text = chunks.join('\n').trim();
  }
  if (!text && Array.isArray(value.choices)) {
    const first = value.choices[0];
    if (isRecord(first) && isRecord(first.message) && typeof first.message.content === 'string') {
      text = first.message.content.trim();
    }
  }
  if (!text) throw new Error('Grok 没有返回文字内容');

  const citations = new Set<string>();
  collectCitationUrls(value, citations);
  return { text, citations: [...citations].slice(0, 12) };
}
