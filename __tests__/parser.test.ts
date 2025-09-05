import { describe, it, expect } from '@jest/globals';
import { parseFeedText, rssToArticles } from '@/lib/parser';
import { extractFaviconFromHtml } from '@/lib/site';
import { fetchTextWithCorsFallback } from '@/lib/net';
import { jest } from '@jest/globals';

const sampleFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Sample Feed</title>
    <description>Example</description>
    <link>https://example.com</link>
    <item>
      <title>Post 1</title>
      <link>https://example.com/post-1</link>
      <description><![CDATA[<p>Hello world</p>]]></description>
      <pubDate>Wed, 01 Jan 2025 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

describe('parser', () => {
  it('parses RSS XML into articles', async () => {
    const articles = await parseFeedText(sampleFeed);
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toContain('Post 1');
    expect(articles[0].link).toContain('post-1');
    expect(typeof articles[0].content).toBe('string');
  });

  it('extracts favicon from HTML head', () => {
    const html = `<!DOCTYPE html><html><head>
      <link rel="icon" href="/favicon.ico" />
    </head><body></body></html>`;
    const base = 'https://example.com/some/page';
    const fav = extractFaviconFromHtml(html, base);
    expect(fav).toBe('https://example.com/favicon.ico');
  });

  it('remembers CORS blocked and uses proxy next time', async () => {
    const originalFetch = global.fetch as any;
    const calls: string[] = [];
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const urlStr = String(input);
      calls.push(urlStr);
      if (urlStr.startsWith('https://example.com')) {
        throw new TypeError('Failed to fetch');
      }
      return {
        ok: true,
        text: async () => 'ok',
      } as any;
    }) as any;
    try {
      // First call should attempt direct then proxy
      await fetchTextWithCorsFallback('https://example.com/data');
      expect(calls.some((u) => u.includes('https://example.com/data'))).toBe(true);
      expect(calls.some((u) => u.includes('go.x2u.in/proxy'))).toBe(true);
      calls.length = 0;
      // Second call should go straight to proxy
      await fetchTextWithCorsFallback('https://example.com/data2');
      expect(calls.find((u) => u.includes('https://example.com/data2'))).toBeUndefined();
      expect(calls.find((u) => u.includes('go.x2u.in/proxy'))).toBeDefined();
    } finally {
      global.fetch = originalFetch;
      try { localStorage.removeItem('rss_reader_cors_blocked'); } catch {}
    }
  });
});

