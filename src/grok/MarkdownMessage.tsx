import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:']);

export function safeMarkdownLink(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return SAFE_LINK_PROTOCOLS.has(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

const markdownComponents: Components = {
  a({ href, children }) {
    const safeHref = safeMarkdownLink(href);
    if (!safeHref) return <span className="grok-markdown-invalid-link">{children}</span>;
    return (
      <a href={safeHref} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    );
  },
  img({ alt }) {
    return <span className="grok-markdown-image-note">[图片：{alt || '外部图片'}]</span>;
  },
  table({ children }) {
    return (
      <div className="grok-markdown-table">
        <table>{children}</table>
      </div>
    );
  },
};

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      skipHtml
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
}
