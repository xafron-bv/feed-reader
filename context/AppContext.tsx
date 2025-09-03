import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Article, Collection, FeedInfo, ParsedArticle, ReadMark } from '@/lib/types';
import { addFeed as storageAddFeed, addOrUpdateCollection, getBookmarks, getCollections, getReadMarks as storageGetReadMarks, loadAllArticles, loadArticles as storageLoadArticles, loadState, markAllInFeed, markArticleRead, markArticleUnread, removeCollection, removeFeed as storageRemoveFeed, saveArticles as storageSaveArticles, saveCollections, saveState, toggleBookmark as storageToggleBookmark } from '@/lib/storage';
import { feedIdFromUrl, articleIdFromLink } from '@/lib/hash';
import { getFeedInfo, parseFeedText } from '@/lib/parser';
import { fetchTextWithCorsFallback } from '@/lib/net';

type AppContextValue = {
  feeds: FeedInfo[];
  collections: Collection[];
  addFeedByUrl: (url: string) => Promise<void>;
  removeFeed: (feedId: string) => Promise<void>;
  getArticles: (feedId: string) => Promise<Article[]>;
  refreshFeed: (feedId: string) => Promise<Article[]>;
  toggleBookmark: (article: Article) => Promise<boolean>;
  getBookmarkedArticles: () => Promise<Article[]>;
  isArticleRead: (articleId: string) => Promise<boolean>;
  setArticleRead: (article: Article, read: boolean) => Promise<void>;
  markAllInFeed: (feedId: string, read: boolean) => Promise<void>;
  getReadMarks: () => Promise<Record<string, ReadMark>>;
  getAllArticles: () => Promise<Article[]>;
  addOrUpdateCollection: (c: Collection) => Promise<void>;
  removeCollection: (id: string) => Promise<void>;
  getCollectionArticles: (collectionId: string) => Promise<Article[]>;
};

export const AppContext = createContext<AppContextValue | undefined>(undefined);

async function fetchText(url: string): Promise<string> { return fetchTextWithCorsFallback(url); }

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [feeds, setFeeds] = useState<FeedInfo[]>([]);
  const [collectionsState, setCollectionsState] = useState<Collection[]>([]);

  useEffect(() => {
    (async () => {
      const state = await loadState();
      setFeeds(state.feeds);
      setCollectionsState(state.collections ?? []);
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

  const isArticleRead = useCallback(async (articleId: string) => {
    const reads = await storageGetReadMarks();
    return !!reads[articleId];
  }, []);

  const setArticleReadCb = useCallback(async (article: Article, read: boolean) => {
    if (read) await markArticleRead(article);
    else await markArticleUnread(article.id);
  }, []);

  const markAllInFeedCb = useCallback(async (feedId: string, read: boolean) => {
    await markAllInFeed(feedId, read);
  }, []);

  const getReadMarksCb = useCallback(async () => {
    return await storageGetReadMarks();
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

  const getAllArticlesCb = useCallback(async () => {
    return await loadAllArticles(feeds);
  }, [feeds]);

  const addOrUpdateCollectionCb = useCallback(async (c: Collection) => {
    await addOrUpdateCollection(c);
    const list = await getCollections();
    setCollectionsState(list);
  }, []);

  const removeCollectionCb = useCallback(async (id: string) => {
    await removeCollection(id);
    const list = await getCollections();
    setCollectionsState(list);
  }, []);

  const getCollectionArticlesCb = useCallback(async (collectionId: string) => {
    const allCollections = await getCollections();
    const col = allCollections.find((c) => c.id === collectionId);
    if (!col) return [];
    const articles: Article[] = [];
    for (const feedId of col.feedIds) {
      const list = await storageLoadArticles(feedId);
      articles.push(...list);
    }
    return articles.sort((a, b) => (b.pubDate || '').localeCompare(a.pubDate || ''));
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      feeds,
      collections: collectionsState,
      addFeedByUrl,
      removeFeed,
      getArticles,
      refreshFeed,
      toggleBookmark,
      getBookmarkedArticles,
      isArticleRead,
      setArticleRead: setArticleReadCb,
      markAllInFeed: markAllInFeedCb,
      getReadMarks: getReadMarksCb,
      getAllArticles: getAllArticlesCb,
      addOrUpdateCollection: addOrUpdateCollectionCb,
      removeCollection: removeCollectionCb,
      getCollectionArticles: getCollectionArticlesCb,
    }),
    [feeds, collectionsState, addFeedByUrl, removeFeed, getArticles, refreshFeed, toggleBookmark, getBookmarkedArticles, isArticleRead, setArticleReadCb, markAllInFeedCb, getReadMarksCb, getAllArticlesCb, addOrUpdateCollectionCb, removeCollectionCb, getCollectionArticlesCb]
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

