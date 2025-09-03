import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article, Bookmark, Collection, FeedInfo, ReadMark, Settings, StoredState } from './types';

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
  const state = await readJson<StoredState>(STORAGE_KEYS.state, { feeds: [], bookmarks: {}, reads: {}, collections: [], settings: { backgroundSyncEnabled: true } });
  // Harden against legacy states missing fields
  (state as any).feeds = state.feeds ?? [];
  (state as any).bookmarks = state.bookmarks ?? {};
  (state as any).reads = state.reads ?? {};
  (state as any).collections = state.collections ?? [];
  (state as any).settings = state.settings ?? { backgroundSyncEnabled: true };
  return state;
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

export async function markArticleRead(article: Article): Promise<void> {
  const state = await loadState();
  const mark: ReadMark = {
    id: article.id,
    feedId: article.feedId,
    readAt: new Date().toISOString(),
  };
  state.reads[article.id] = mark;
  await saveState(state);
}

export async function markArticleUnread(articleId: string): Promise<void> {
  const state = await loadState();
  delete state.reads[articleId];
  await saveState(state);
}

export async function getReadMarks(): Promise<Record<string, ReadMark>> {
  const state = await loadState();
  return state.reads;
}

export async function markAllInFeed(feedId: string, read: boolean, articles?: Article[]): Promise<void> {
  const state = await loadState();
  if (read) {
    const list = articles ?? (await loadArticles(feedId));
    const now = new Date().toISOString();
    for (const a of list) {
      state.reads[a.id] = { id: a.id, feedId, readAt: now };
    }
  } else {
    for (const [id, mark] of Object.entries(state.reads)) if (mark.feedId === feedId) delete state.reads[id];
  }
  await saveState(state);
}

export async function loadAllArticles(feeds: FeedInfo[]): Promise<Article[]> {
  const all: Article[] = [];
  for (const f of feeds) {
    const items = await loadArticles(f.id);
    all.push(...items);
  }
  return all.sort((a, b) => (b.pubDate || '').localeCompare(a.pubDate || ''));
}

export async function getCollections(): Promise<Collection[]> {
  const state = await loadState();
  return state.collections;
}

export async function saveCollections(collections: Collection[]): Promise<void> {
  const state = await loadState();
  state.collections = collections;
  await saveState(state);
}

export async function addOrUpdateCollection(collection: Collection): Promise<void> {
  const state = await loadState();
  const idx = state.collections.findIndex((c) => c.id === collection.id);
  if (idx >= 0) state.collections[idx] = collection; else state.collections.push(collection);
  await saveState(state);
}

export async function removeCollection(collectionId: string): Promise<void> {
  const state = await loadState();
  state.collections = state.collections.filter((c) => c.id !== collectionId);
  await saveState(state);
}

export async function loadSettings(): Promise<Settings> {
  const state = await loadState();
  return state.settings ?? { backgroundSyncEnabled: true };
}

export async function saveSettings(settings: Settings): Promise<void> {
  const state = await loadState();
  state.settings = settings;
  await saveState(state);
}

export async function updateLastSync(timestampIso: string): Promise<void> {
  const state = await loadState();
  state.settings = { ...(state.settings ?? { backgroundSyncEnabled: true }), lastSyncAt: timestampIso };
  await saveState(state);
}

