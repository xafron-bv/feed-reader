import React, { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, Link } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TextInput } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAppContext } from '@/context/AppContext';
import { Article } from '@/lib/types';
import { formatRelativeFromNow } from '@/lib/date';

export default function FeedArticlesScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const feedId = params.id;
  const { getArticles, refreshFeed } = useAppContext();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!feedId) return;
    const list = await getArticles(String(feedId));
    setArticles(list);
    setLoading(false);
  }, [feedId, getArticles]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    if (!feedId) return;
    setRefreshing(true);
    const latest = await refreshFeed(String(feedId));
    setArticles(latest);
    setRefreshing(false);
  };

  const filtered = articles.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.content.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: Article }) => (
    <Link href={{ pathname: '/article', params: { id: item.id, feedId: item.feedId } }} asChild>
      <View style={styles.row} testID="article-row">
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.meta}>{formatRelativeFromNow(item.pubDate)}</Text>
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
  row: { paddingVertical: 10 },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { color: '#666' },
  separator: { height: 1, backgroundColor: '#eee' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

