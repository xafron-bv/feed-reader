import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addFeed, addOrUpdateCollection, aggregateCollectionArticles, getCollections, getReadMarks, loadAllArticles, loadArticles, loadState, markAllInFeed, markArticleRead, markArticleUnread, mergeAndSaveArticles, removeCollection, saveArticles } from '@/lib/storage';
import { feedIdFromUrl, articleIdFromLink } from '@/lib/hash';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

beforeEach(async () => {
  await (AsyncStorage as any).clear();
});

describe('reads and collections storage', () => {
  it('marks articles as read/unread and mark-all works', async () => {
    const url = 'https://example.com/feed.xml';
    const feedId = feedIdFromUrl(url);
    await addFeed({ id: feedId, url, title: 'Sample' });
    const a1 = { id: articleIdFromLink('https://example.com/p1'), feedId, title: 'P1', content: '<p>1</p>', link: 'https://example.com/p1' };
    const a2 = { id: articleIdFromLink('https://example.com/p2'), feedId, title: 'P2', content: '<p>2</p>', link: 'https://example.com/p2' };
    await saveArticles(feedId, [a1, a2]);

    await markArticleRead(a1);
    let reads = await getReadMarks();
    expect(!!reads[a1.id]).toBe(true);

    await markArticleUnread(a1.id);
    reads = await getReadMarks();
    expect(!!reads[a1.id]).toBe(false);

    await markAllInFeed(feedId, true);
    reads = await getReadMarks();
    expect(!!reads[a1.id]).toBe(true);
    expect(!!reads[a2.id]).toBe(true);

    await markAllInFeed(feedId, false);
    reads = await getReadMarks();
    expect(Object.keys(reads).length).toBe(0);
  });

  it('creates, lists, and removes collections and aggregates articles', async () => {
    const url1 = 'https://example.com/f1.xml';
    const url2 = 'https://example.com/f2.xml';
    const f1 = feedIdFromUrl(url1);
    const f2 = feedIdFromUrl(url2);
    await addFeed({ id: f1, url: url1, title: 'F1' });
    await addFeed({ id: f2, url: url2, title: 'F2' });

    await saveArticles(f1, [{ id: articleIdFromLink('https://e.com/1'), feedId: f1, title: 'A1', content: 'c', link: 'https://e.com/1' }]);
    await saveArticles(f2, [
      { id: articleIdFromLink('https://e.com/2'), feedId: f2, title: 'A2', content: 'c', link: 'https://e.com/2' },
      // duplicate by link should be deduped in aggregate
      { id: articleIdFromLink('https://e.com/1'), feedId: f2, title: 'Dup', content: 'c', link: 'https://e.com/1' }
    ]);

    const collection = { id: 'c1', name: 'My Col', feedIds: [f1, f2], createdAt: new Date().toISOString() };
    await addOrUpdateCollection(collection);
    let cols = await getCollections();
    expect(cols.find((c) => c.id === 'c1')).toBeTruthy();

    const all = await loadAllArticles([{ id: f1, url: url1 }, { id: f2, url: url2 }]);
    expect(all.length).toBe(3);

    const agg = await aggregateCollectionArticles(collection);
    expect(agg.length).toBe(2);

    await removeCollection('c1');
    cols = await getCollections();
    expect(cols.find((c) => c.id === 'c1')).toBeFalsy();
  });
});

describe('mergeAndSaveArticles', () => {
  it('merges new articles into existing by id and sorts', async () => {
    const url = 'https://example.com/feed.xml';
    const feedId = feedIdFromUrl(url);
    await addFeed({ id: feedId, url, title: 'Sample' });
    const a1 = { id: articleIdFromLink('https://example.com/a1'), feedId, title: '1', content: 'x', link: 'https://example.com/a1', pubDate: '2025-01-01T10:00:00.000Z' };
    const a2 = { id: articleIdFromLink('https://example.com/a2'), feedId, title: '2', content: 'y', link: 'https://example.com/a2', pubDate: '2025-01-02T10:00:00.000Z' };
    await saveArticles(feedId, [a1]);
    const merged = await mergeAndSaveArticles(feedId, [a2]);
    expect(merged.map(a => a.id)).toEqual([a2.id, a1.id]);
  });
});