import { XMLParser } from 'fast-xml-parser';
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
  const parsed = parseXmlToFeed(feedText);
  return rssToArticles(parsed.items || []);
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
  const feedInfo = parseXmlToFeed(feedText);

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
    link: feedInfo.link,
    lastBuildDate: convertDateStringToDate(lastBuild),
  };
}

export function extractNextPageUrl(feedText: string): string | undefined {
  // Try to find Atom rel="next" link
  const regexes = [
    /<link[^>]*rel=["']next["'][^>]*href=["']([^"']+)["'][^>]*>/i,
    /<\w*:?link[^>]*href=["']([^"']+)["'][^>]*rel=["']next["'][^>]*>/i,
  ];
  for (const re of regexes) {
    const m = re.exec(feedText);
    if (m && m[1]) return m[1];
  }
  return undefined;
}

function parseXmlToFeed(feedText: string): RSSFeed {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: '#text',
    allowBooleanAttributes: true,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
  });
  const xml = parser.parse(feedText);

  // RSS 2.0 shape: rss.channel.item[]
  if (xml?.rss?.channel) {
    const ch = xml.rss.channel;
    const items = Array.isArray(ch.item) ? ch.item : ch.item ? [ch.item] : [];
    return {
      title: ch.title?.['#text'] ?? ch.title,
      link: ch.link?.['#text'] ?? ch.link,
      description: ch.description?.['#text'] ?? ch.description,
      image: ch.image?.url?.['#text'] ?? ch.image?.url,
      items: items.map(normalizeItem),
      lastBuildDate: ch.lastBuildDate?.['#text'] ?? ch.lastBuildDate,
      pubDate: ch.pubDate?.['#text'] ?? ch.pubDate,
    } as RSSFeed;
  }

  // RSS 1.0 / RDF shape: rdf:RDF { channel, item[] }
  const rdf = (xml && (xml.RDF || (xml as any)['rdf:RDF'])) as any;
  if (rdf) {
    const ch = Array.isArray(rdf.channel) ? rdf.channel[0] : rdf.channel;
    const items = Array.isArray(rdf.item) ? rdf.item : rdf.item ? [rdf.item] : [];
    return {
      title: ch?.title?.['#text'] ?? ch?.title,
      link: ch?.link?.['#text'] ?? ch?.link,
      description: ch?.description?.['#text'] ?? ch?.description,
      items: items.map(normalizeItem),
      // RSS 1.0 may not have lastBuildDate; use dc:date if available
      lastBuildDate: ch?.date?.['#text'] ?? ch?.date,
    } as RSSFeed;
  }

  // Atom shape: feed.entry[]
  if (xml?.feed) {
    const f = xml.feed;
    const entries = Array.isArray(f.entry) ? f.entry : f.entry ? [f.entry] : [];
    // Try to extract main link rel=self or alternate
    const feedLink = pickAtomLinkHref(f.link);
    return {
      title: f.title?.['#text'] ?? f.title,
      link: feedLink,
      description: f.subtitle?.['#text'] ?? f.subtitle,
      items: entries.map(normalizeItem),
      updated: f.updated?.['#text'] ?? f.updated,
      published: f.published?.['#text'] ?? f.published,
      modified: f.modified?.['#text'] ?? f.modified,
      issued: f.issued?.['#text'] ?? f.issued,
      created: f.created?.['#text'] ?? f.created,
    } as RSSFeed;
  }

  // Fallback: try to detect list of items generically
  const possibleItems = xml?.channel?.item || xml?.items || [];
  const items = Array.isArray(possibleItems) ? possibleItems : possibleItems ? [possibleItems] : [];
  return { items: items.map(normalizeItem) } as RSSFeed;
}

function normalizeItem(raw: any): RSSItem {
  // Prefer text node when present
  const val = (v: any) => (v && typeof v === 'object' && '#text' in v ? v['#text'] : v);
  const title = val(raw.title) ?? val(raw['media:title']) ?? val(raw['dc:title']);
  const link = extractLink(raw) ?? val(raw['rdf:about']) ?? val(raw.about);
  const description = val(raw.description) ?? val(raw.summary) ?? val(raw.content) ?? val(raw.subtitle) ?? val(raw.contentSnippet) ?? val(raw['dc:description']);
  const image = extractImage(raw);
  const pubDate = val(raw.pubDate) ?? val(raw.updated) ?? val(raw.published) ?? val(raw.modified) ?? val(raw.issued) ?? val(raw.created);
  const item: RSSItem = {
    title,
    link,
    description,
    image,
    pubDate,
    // keep originals too for flexible access
    ...raw,
  };
  return item;
}

function extractLink(raw: any): string | undefined {
  const val = (v: any) => (v && typeof v === 'object' && '#text' in v ? v['#text'] : v);
  if (raw.link) {
    if (Array.isArray(raw.link)) {
      const firstHref = raw.link.find((l: any) => l.href)?.href || raw.link[0];
      return val(firstHref);
    }
    if (typeof raw.link === 'object') return raw.link.href || val(raw.link);
    return val(raw.link);
  }
  // Some RSS 1.0 items may use rdf:about as the canonical URL
  if (raw['rdf:about']) return val(raw['rdf:about']);
  // Atom may use "id" as stable link
  if (raw.id) return val(raw.id);
  return undefined;
}

function pickAtomLinkHref(link: any): string | undefined {
  if (!link) return undefined;
  const arr = Array.isArray(link) ? link : [link];
  const alt = arr.find((l) => l.rel === 'alternate' && l.href)?.href;
  const self = arr.find((l) => l.rel === 'self' && l.href)?.href;
  return alt || self || arr.find((l) => l.href)?.href;
}

function extractImage(raw: any): string | undefined {
  const val = (v: any) => (v && typeof v === 'object' && '#text' in v ? v['#text'] : v);
  if (raw.enclosure && (raw.enclosure.url || raw.enclosure.href)) return raw.enclosure.url || raw.enclosure.href;
  if (raw['media:content'] && raw['media:content'].url) return raw['media:content'].url;
  if (raw['media:thumbnail'] && raw['media:thumbnail'].url) return raw['media:thumbnail'].url;
  if (raw.image && raw.image.url) return val(raw.image.url);
  if (raw.image) return val(raw.image);
  return undefined;
}

