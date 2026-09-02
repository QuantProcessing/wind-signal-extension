import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MarkdownMessage, safeMarkdownLink } from './MarkdownMessage';

describe('MarkdownMessage', () => {
  it('renders common Grok markdown structures', () => {
    const html = renderToStaticMarkup(
      <MarkdownMessage
        content={'**NINJA**\n\n### 它是什么\n\n- 叙事起点\n- 近期催化\n\n[来源](https://x.com/example/status/1)'}
      />,
    );

    expect(html).toContain('<strong>NINJA</strong>');
    expect(html).toContain('<h3>它是什么</h3>');
    expect(html).toContain('<li>叙事起点</li>');
    expect(html).toContain('href="https://x.com/example/status/1"');
    expect(html).toContain('target="_blank"');
  });

  it('does not render raw html or unsafe links', () => {
    const html = renderToStaticMarkup(
      <MarkdownMessage content={'<script>alert(1)</script>\n\n[危险链接](javascript:alert(1))'} />,
    );

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('href=');
    expect(html).toContain('危险链接');
  });
});

describe('safeMarkdownLink', () => {
  it('only accepts http and https links', () => {
    expect(safeMarkdownLink('https://example.com/path')).toBe('https://example.com/path');
    expect(safeMarkdownLink('http://example.com')).toBe('http://example.com/');
    expect(safeMarkdownLink('javascript:alert(1)')).toBeUndefined();
    expect(safeMarkdownLink('/relative')).toBeUndefined();
  });
});
