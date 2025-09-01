import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Article, FeedInfo, ParsedArticle } from '@/lib/types';
import { addFeed as storageAddFeed, getBookmarks, loadArticles as storageLoadArticles, loadState, removeFeed as storageRemoveFeed, saveArticles as storageSaveArticles, saveState, toggleBookmark as storageToggleBookmark } from '@/lib/storage';
import { feedIdFromUrl, articleIdFromLink } from '@/lib/hash';
import { getFeedInfo, parseFeedText } from '@/lib/parser';

type AppContextValue = {
  feeds: FeedInfo[];
  addFeedByUrl: (url: string) => Promise<void>;
  removeFeed: (feedId: string) => Promise<void>;
  getArticles: (feedId: string) => Promise<Article[]>;
  refreshFeed: (feedId: string) => Promise<Article[]>;
  toggleBookmark: (article: Article) => Promise<boolean>;
  getBookmarkedArticles: () => Promise<Article[]>;
};

export const AppContext = createContext<AppContextValue | undefined>(undefined);

async function fetchText(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (res.ok) return await res.text();
    throw new Error(`HTTP ${res.status}`);
  } catch (_err) {
    // Fallback for web CORS: use AllOrigins proxy
    const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const resp = await fetch(proxied);
    if (!resp.ok) throw new Error('Failed to fetch feed');
    return await resp.text();
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [feeds, setFeeds] = useState<FeedInfo[]>([]);

  useEffect(() => {
    (async () => {
      const state = await loadState();
      setFeeds(state.feeds);
    })();
  }, []);

  const addFeedByUrl = useCallback(async (url: string) => {
    const id = feedIdFromUrl(url);
    const text = await fetchText(url);
    const info = await getFeedInfo(text);
    const feed: FeedInfo = {
      id,
      url,
      title: info.title,
      description: info.description,
      lastBuildDate: info.lastBuildDate ? info.lastBuildDate.toISOString() : undefined,
    };
    await storageAddFeed(feed);
    setFeeds((prev) => {
      const existingIndex = prev.findIndex((f) => f.id === id);
      if (existingIndex >= 0) {
        const clone = prev.slice();
        clone[existingIndex] = feed;
        return clone;
      }
      return [feed, ...prev];
    });

    // Preload latest articles for offline use
    const parsed = await parseFeedText(text);
    const articles = transformParsedArticlesToArticles(id, parsed);
    await storageSaveArticles(id, articles);
  }, []);

  const removeFeed = useCallback(async (feedId: string) => {
    await storageRemoveFeed(feedId);
    setFeeds((prev) => prev.filter((f) => f.id !== feedId));
  }, []);

  const getArticles = useCallback(async (feedId: string) => {
    return await storageLoadArticles(feedId);
  }, []);

  const refreshFeed = useCallback(async (feedId: string) => {
    const feed = feeds.find((f) => f.id === feedId);
    if (!feed) return [];
    const text = await fetchText(feed.url);
    const parsed = await parseFeedText(text);
    const newArticles = transformParsedArticlesToArticles(feedId, parsed);
    await storageSaveArticles(feedId, newArticles);
    return newArticles;
  }, [feeds]);

  const toggleBookmark = useCallback(async (article: Article) => {
    const result = await storageToggleBookmark(article);
    // Also update the cached articles for the feed
    const current = await storageLoadArticles(article.feedId);
    const updated = current.map((a) => (a.id === article.id ? { ...a } : a));
    await storageSaveArticles(article.feedId, updated);
    return result.bookmarked;
  }, []);

  const getBookmarkedArticles = useCallback(async () => {
    const bookmarks = await getBookmarks();
    const bookmarkIds = new Set(Object.keys(bookmarks));
    const all: Article[] = [];
    for (const feed of feeds) {
      const articles = await storageLoadArticles(feed.id);
      for (const a of articles) if (bookmarkIds.has(a.id)) all.push(a);
    }
    return all.sort((a, b) => (b.pubDate || '').localeCompare(a.pubDate || ''));
  }, [feeds]);

  const value = useMemo<AppContextValue>(
    () => ({
      feeds,
      addFeedByUrl,
      removeFeed,
      getArticles,
      refreshFeed,
      toggleBookmark,
      getBookmarkedArticles,
    }),
    [feeds, addFeedByUrl, removeFeed, getArticles, refreshFeed, toggleBookmark, getBookmarkedArticles]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function transformParsedArticlesToArticles(feedId: string, parsed: ParsedArticle[]): Article[] {
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

export function useAppContext(): AppContextValue {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error('AppContext not available');
  return ctx;
}

