import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article, Bookmark, FeedInfo, StoredState } from './types';

const STORAGE_KEYS = {
  state: 'rss_reader_state_v1',
  articlesPrefix: 'rss_reader_articles_v1:', // + feedId
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadState(): Promise<StoredState> {
  return readJson<StoredState>(STORAGE_KEYS.state, { feeds: [], bookmarks: {} });
}

export async function saveState(state: StoredState): Promise<void> {
  await writeJson(STORAGE_KEYS.state, state);
}

export async function loadArticles(feedId: string): Promise<Article[]> {
  return readJson<Article[]>(STORAGE_KEYS.articlesPrefix + feedId, []);
}

export async function saveArticles(feedId: string, articles: Article[]): Promise<void> {
  await writeJson(STORAGE_KEYS.articlesPrefix + feedId, articles);
}

export async function addFeed(feed: FeedInfo): Promise<void> {
  const state = await loadState();
  const index = state.feeds.findIndex((f) => f.id === feed.id);
  if (index >= 0) state.feeds[index] = feed; else state.feeds.push(feed);
  await saveState(state);
}

export async function removeFeed(feedId: string): Promise<void> {
  const state = await loadState();
  state.feeds = state.feeds.filter((f) => f.id !== feedId);
  await saveState(state);
  await AsyncStorage.removeItem(STORAGE_KEYS.articlesPrefix + feedId);
}

export async function toggleBookmark(article: Article): Promise<{ updated: Article; bookmarked: boolean }>{
  const state = await loadState();
  const bookmarkId = article.id;
  const exists = !!state.bookmarks[bookmarkId];
  if (exists) {
    delete state.bookmarks[bookmarkId];
  } else {
    const newBookmark: Bookmark = {
      id: bookmarkId,
      feedId: article.feedId,
      createdAt: new Date().toISOString(),
    };
    state.bookmarks[bookmarkId] = newBookmark;
  }
  await saveState(state);
  return { updated: article, bookmarked: !exists };
}

export async function getBookmarks(): Promise<Record<string, Bookmark>> {
  const state = await loadState();
  return state.bookmarks;
}

