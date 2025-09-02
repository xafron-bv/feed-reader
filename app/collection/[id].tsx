import React, { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, Link } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TextInput, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAppContext } from '@/context/AppContext';
import { Article } from '@/lib/types';
import { formatRelativeFromNow } from '@/lib/date';

export default function CollectionArticlesScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const collectionId = params.id;
  const { getCollectionArticles, getReadMarks } = useAppContext() as any;
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!collectionId) return;
    const list = await getCollectionArticles(String(collectionId));
    setArticles(list);
    setLoading(false);
  }, [collectionId, getCollectionArticles]);

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
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = articles.filter((a) => {
    if (showOnlyUnread && readMap[a.id]) return false;
    const q = search.toLowerCase();
    return a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
  });

  const renderItem = ({ item }: { item: Article }) => (
    <Link href={{ pathname: '/article', params: { id: item.id, feedId: item.feedId } }} asChild>
      <View style={[styles.row, readMap[item.id] ? styles.rowRead : null]}>
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
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(a) => a.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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