import ParserModule from 'rss-parser';
import { ParsedArticle } from './types';
import { convertDateStringToDate } from './date';

type RSSFeed = {
  title?: string;
  link?: string;
  description?: string;
  image?: string;
  items: RSSItem[];
  lastBuildDate?: string;
  paginationLinks?: Record<string, string>;
  updated?: string;
  pubDate?: string;
  published?: string;
  modified?: string;
  issued?: string;
  created?: string;
};

type RSSItem = {
  [key: string]: any;
};

export async function parseFeedText(feedText: string): Promise<ParsedArticle[]> {
  const rssParser = new ParserModule<RSSFeed, RSSItem>({
    customFields: {
      feed: ['image'],
      item: ['image', 'content', 'contentSnippet', 'description', 'subtitle', 'summary'],
    },
  });
  const rssFeed = await rssParser.parseString(feedText);
  return rssToArticles(rssFeed.items);
}

export function rssToArticles(rss: RSSItem[]): ParsedArticle[] {
  return rss.map((item) => ({
    title: getTitle(item),
    content: getContent(item),
    link: getLink(item),
    pubDate: getDate(item),
    image: getImage(item),
  }));
}

function getTitle(item: RSSItem) {
  const title = getSimilarField(item, 'title');
  if (!title) throw new Error('No title found');
  return String(title);
}

function getContent(item: RSSItem) {
  const content =
    getSimilarField(item, 'content') ||
    getSimilarField(item, 'contentSnippet') ||
    getSimilarField(item, 'description') ||
    getSimilarField(item, 'subtitle') ||
    getSimilarField(item, 'summary');
  if (!content) throw new Error('No content found');
  return String(content);
}

function getLink(item: RSSItem) {
  const link = getSimilarField(item, 'link');
  if (!link) throw new Error('No link found');
  return String(link);
}

function getImage(item: RSSItem) {
  const value = getSimilarField(item, 'image');
  return value ? String(value) : undefined;
}

function getDate(item: RSSItem): Date | undefined {
  const pubDate = item.pubDate || getSimilarField(item, 'date');
  return convertDateStringToDate(pubDate);
}

function getSimilarField(item: RSSItem, field: string) {
  if (item[field]) return item[field];
  for (const [key, value] of Object.entries(item)) {
    if (new RegExp(field, 'i').test(key)) return value;
  }
  return undefined;
}

export async function getFeedInfo(feedText: string) {
  const rssParser = new ParserModule<RSSFeed, RSSItem>();
  const feedInfo = await rssParser.parseString(feedText);

  const lastBuild =
    feedInfo.lastBuildDate ||
    feedInfo.updated ||
    feedInfo.pubDate ||
    feedInfo.published ||
    feedInfo.modified ||
    feedInfo.issued;

  return {
    title: feedInfo.title,
    description: feedInfo.description,
    lastBuildDate: convertDateStringToDate(lastBuild),
  };
}

