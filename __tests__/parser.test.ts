import { describe, it, expect } from '@jest/globals';
import { parseFeedText, rssToArticles } from '@/lib/parser';
import { extractFaviconFromHtml } from '@/lib/site';

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
});

