import { FeedInfo, ParsedArticle } from './types';
import { parseFeedText } from './parser';
import { fetchTextWithCorsFallback } from './net';
import { saveArticles } from './storage';
import { articleIdFromLink } from './hash';

export async function refreshAllFeeds(feeds: FeedInfo[]): Promise<void> {
  for (const feed of feeds) {
    try {
      const text = await fetchTextWithCorsFallback(feed.url);
      const parsed = await parseFeedText(text);
      const normalized = transformParsedArticlesToArticles(feed.id, parsed);
      await saveArticles(feed.id, normalized);
    } catch {
      // ignore individual feed errors
    }
  }
}

function transformParsedArticlesToArticles(feedId: string, parsed: ParsedArticle[]): any[] {
  return parsed.map((p) => ({
    id: articleIdFromLink(p.link),
    feedId,
    title: p.title,
    content: p.content,
    link: p.link,
    pubDate: p.pubDate ? p.pubDate.toISOString() : undefined,
    image: p.image,
  }));
}