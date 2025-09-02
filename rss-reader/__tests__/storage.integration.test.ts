import AsyncStorage from '@react-native-async-storage/async-storage';
import { addFeed, loadArticles, loadState, saveArticles, toggleBookmark, getBookmarks } from '@/lib/storage';
import { feedIdFromUrl, articleIdFromLink } from '@/lib/hash';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('storage integration', () => {
  it('stores feeds, articles, and bookmarks', async () => {
    const url = 'https://example.com/feed.xml';
    const feedId = feedIdFromUrl(url);
    await addFeed({ id: feedId, url, title: 'Sample' });
    const state = await loadState();
    expect(state.feeds.find((f) => f.id === feedId)).toBeTruthy();

    const articleId = articleIdFromLink('https://example.com/p1');
    await saveArticles(feedId, [{ id: articleId, feedId, title: 'A', content: '<p>c</p>', link: 'https://example.com/p1' }]);
    const loaded = await loadArticles(feedId);
    expect(loaded).toHaveLength(1);

    const { bookmarked } = await toggleBookmark(loaded[0]);
    expect(bookmarked).toBe(true);
    const bm = await getBookmarks();
    expect(bm[articleId]).toBeTruthy();
  });
});

