import React, { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, Link } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TextInput, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAppContext } from '@/context/AppContext';
import { Article } from '@/lib/types';
import { formatRelativeFromNow } from '@/lib/date';

export default function FeedArticlesScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const feedId = params.id;
  const { getArticles, refreshFeed, getReadMarks, markAllInFeed } = useAppContext();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!feedId) return;
    const list = await getArticles(String(feedId));
    setArticles(list);
    setLoading(false);
  }, [feedId, getArticles]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      const marks = await getReadMarks();
      const map: Record<string, boolean> = {};
      for (const id of Object.keys(marks)) map[id] = true;
      setReadMap(map);
    })();
  }, [articles]);

  const onRefresh = async () => {
    if (!feedId) return;
    setRefreshing(true);
    const latest = await refreshFeed(String(feedId));
    setArticles(latest);
    setRefreshing(false);
  };

  const filtered = articles.filter((a) => {
    if (showOnlyUnread && readMap[a.id]) return false;
    const q = search.toLowerCase();
    return a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
  });

  const renderItem = ({ item }: { item: Article }) => (
    <Link href={{ pathname: '/article', params: { id: item.id, feedId: item.feedId } }} asChild>
      <View style={[styles.row, readMap[item.id] ? styles.rowRead : null]} testID="article-row">
        <Text style={[styles.title, readMap[item.id] ? styles.titleRead : null]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.meta, readMap[item.id] ? styles.metaRead : null]}>{formatRelativeFromNow(item.pubDate)}</Text>
      </View>
    </Link>
  );

  if (loading) {
    return (
      <View style={styles.center}> 
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search"
        value={search}
        onChangeText={setSearch}
        style={styles.input}
      />
      <View style={styles.controlsRow}>
        <Pressable accessibilityRole="button" onPress={() => setShowOnlyUnread((v) => !v)}>
          <Text style={styles.link}>{showOnlyUnread ? 'Show all' : 'Show unread'}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable accessibilityRole="button" onPress={() => feedId && markAllInFeed(String(feedId), true).then(load)}>
          <Text style={styles.link}>Mark all read</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => feedId && markAllInFeed(String(feedId), false).then(load)}>
          <Text style={styles.link}>Mark all unread</Text>
        </Pressable>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(a) => a.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        testID="articles-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 10, height: 40, marginBottom: 12 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  row: { paddingVertical: 10 },
  rowRead: { opacity: 0.6 },
  title: { fontSize: 16, fontWeight: '600' },
  titleRead: { fontWeight: '400' },
  meta: { color: '#666' },
  metaRead: { color: '#999' },
  separator: { height: 1, backgroundColor: '#eee' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  link: { color: '#007aff', paddingHorizontal: 8, paddingVertical: 4 },
});

