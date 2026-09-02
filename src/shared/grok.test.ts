import { describe, expect, it } from 'vitest';
import { buildSub2ApiResponsesUrl, parseGrokResponse, sub2ApiPermissionPattern } from './grok';

describe('Sub2API Grok helpers', () => {
  it('normalizes server, v1 and responses URLs', () => {
    expect(buildSub2ApiResponsesUrl('https://api.example.com')).toBe(
      'https://api.example.com/v1/responses',
    );
    expect(buildSub2ApiResponsesUrl('https://api.example.com/proxy/v1/')).toBe(
      'https://api.example.com/proxy/v1/responses',
    );
    expect(buildSub2ApiResponsesUrl('http://127.0.0.1:8080/v1/responses')).toBe(
      'http://127.0.0.1:8080/v1/responses',
    );
  });

  it('builds the narrow host permission pattern', () => {
    expect(sub2ApiPermissionPattern('https://api.example.com/proxy/v1')).toBe(
      'https://api.example.com/*',
    );
  });

  it('rejects malformed and credential-bearing server URLs', () => {
    expect(() => buildSub2ApiResponsesUrl('ftp://api.example.com')).toThrow('http');
    expect(() => buildSub2ApiResponsesUrl('https://user:secret@api.example.com')).toThrow(
      '账号或密码',
    );
  });

  it('extracts text and unique citation URLs from a Responses payload', () => {
    expect(
      parseGrokResponse({
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: '这是叙事摘要',
                annotations: [
                  { type: 'url_citation', url: 'https://x.com/example/status/1' },
                  { type: 'url_citation', url: 'https://x.com/example/status/1' },
                ],
              },
            ],
          },
        ],
      }),
    ).toEqual({
      text: '这是叙事摘要',
      citations: ['https://x.com/example/status/1'],
    });
  });
});
