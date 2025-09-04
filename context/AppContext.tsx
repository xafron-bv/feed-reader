import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Article, Collection, FeedInfo, ParsedArticle, ReadMark, Settings } from '@/lib/types';
import { addFeed as storageAddFeed, addOrUpdateCollection, aggregateCollectionArticles, getBookmarks, getCollections, getReadMarks as storageGetReadMarks, loadAllArticles, loadArticles as storageLoadArticles, loadCollectionArticles, loadSettings, loadState, markAllInFeed, markArticleRead, markArticleUnread, mergeAndSaveArticles, removeCollection, removeFeed as storageRemoveFeed, saveArticles as storageSaveArticles, saveCollections, saveSettings, saveState, toggleBookmark as storageToggleBookmark, updateLastSync } from '@/lib/storage';
import { refreshAllFeeds } from '@/lib/refresh';
import { feedIdFromUrl, articleIdFromLink } from '@/lib/hash';
import { extractNextPageUrl, getFeedInfo, parseFeedText } from '@/lib/parser';
import { extractFaviconFromHtml } from '@/lib/site';
import { fetchTextWithCorsFallback } from '@/lib/net';

type AppContextValue = {
  feeds: FeedInfo[];
  collections: Collection[];
  settings: Settings;
  setSettings: (s: Settings) => Promise<void>;
  addFeedByUrl: (url: string) => Promise<void>;
  removeFeed: (feedId: string) => Promise<void>;
  getArticles: (feedId: string) => Promise<Article[]>;
  refreshFeed: (feedId: string) => Promise<Article[]>;
  syncAll: () => Promise<void>;
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
  const [settings, setSettingsState] = useState<Settings>({ backgroundSyncEnabled: true });

  useEffect(() => {
    (async () => {
      const state = await loadState();
      setFeeds(state.feeds);
      setCollectionsState(state.collections ?? []);
      setSettingsState(state.settings ?? { backgroundSyncEnabled: true });
      // Backfill missing favicons for existing feeds
      try {
        const updates: FeedInfo[] = [];
        for (const f of state.feeds ?? []) {
          if (f.faviconUrl) continue;
          let siteUrl = f.siteUrl;
          try {
            if (!siteUrl) {
              // Try to resolve site link from the feed XML
              const feedXml = await fetchText(f.url);
              const info = await getFeedInfo(feedXml);
              siteUrl = info.link || siteUrl;
            }
            if (!siteUrl) {
              // Fallback to origin of the feed URL
              const u = new URL(f.url);
              siteUrl = `${u.origin}/`;
            }
            // Attempt favicon extraction
            const html = await fetchText(siteUrl);
            const fav = extractFaviconFromHtml(html, siteUrl);
            if (fav) updates.push({ ...f, siteUrl, faviconUrl: fav });
          } catch {}
        }
        if (updates.length > 0) {
          const nextFeeds = (state.feeds ?? []).map((old) => updates.find((u) => u.id === old.id) || old);
          setFeeds(nextFeeds);
          await saveState({ ...state, feeds: nextFeeds });
        }
      } catch {}
    })();
  }, []);

  const addFeedByUrl = useCallback(async (url: string) => {
    const id = feedIdFromUrl(url);
    // Insert a temporary loading row immediately
    setFeeds((prev) => {
      const exists = prev.some((f) => f.id === id);
      if (exists) return prev;
      const loadingFeed: FeedInfo = { id, url, title: url, isLoading: true } as FeedInfo;
      return [loadingFeed, ...prev];
    });
    const text = await fetchText(url);
    const info = await getFeedInfo(text);
    // Try favicon discovery: fetch site HTML using feed link or derive from articles later
    let faviconUrl: string | undefined;
    let siteUrl: string | undefined = info.link;
    if (!siteUrl) {
      try { const u = new URL(url); siteUrl = `${u.origin}/`; } catch {}
    }
    try {
      if (siteUrl) {
        const html = await fetchText(siteUrl);
        faviconUrl = extractFaviconFromHtml(html, siteUrl);
      }
    } catch {}
    const feed: FeedInfo = {
      id,
      url,
      title: info.title,
      description: info.description,
      siteUrl,
      faviconUrl,
      lastBuildDate: info.lastBuildDate ? info.lastBuildDate.toISOString() : undefined,
      nextPageUrl: extractNextPageUrl(text),
    };
    await storageAddFeed(feed);
    setFeeds((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      return [feed, ...filtered];
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
    const merged = await mergeAndSaveArticles(feedId, newArticles);
    // Update next page url if available
    const next = extractNextPageUrl(text);
    if (next) {
      setFeeds((prev) => prev.map((f) => (f.id === feedId ? { ...f, nextPageUrl: next } : f)));
      const state = await loadState();
      const idx = state.feeds.findIndex((f) => f.id === feedId);
      if (idx >= 0) { state.feeds[idx].nextPageUrl = next; await saveState(state); }
    }
    return merged;
  }, [feeds]);

  const syncAll = useCallback(async () => {
    await refreshAllFeeds(feeds);
    await updateLastSync(new Date().toISOString());
    // refresh settings state
    const s = await loadSettings();
    setSettingsState(s);
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
    const bookmarkIds = new Set(Object.keys(bookmarks ?? {}));
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

  const setSettingsCb = useCallback(async (s: Settings) => {
    await saveSettings(s);
    setSettingsState(s);
  }, []);

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
    // Use cached aggregated if available; else compute and persist
    const cached = await loadCollectionArticles(col.id);
    if (cached.length > 0) return cached;
    return await aggregateCollectionArticles(col);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      feeds,
      collections: collectionsState,
      settings,
      setSettings: setSettingsCb,
      addFeedByUrl,
      removeFeed,
      getArticles,
      refreshFeed,
      syncAll,
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
    [feeds, collectionsState, settings, setSettingsCb, addFeedByUrl, removeFeed, getArticles, refreshFeed, syncAll, toggleBookmark, getBookmarkedArticles, isArticleRead, setArticleReadCb, markAllInFeedCb, getReadMarksCb, getAllArticlesCb, addOrUpdateCollectionCb, removeCollectionCb, getCollectionArticlesCb]
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

