import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAppContext } from '@/context/AppContext';
import { Article } from '@/lib/types';
import { router } from 'expo-router';

export default function BookmarksScreen() {
  const { getBookmarkedArticles } = useAppContext();
  const [articles, setArticles] = useState<Article[]>([]);

  const load = async () => {
    const a = await getBookmarkedArticles();
    setArticles(a);
  };

  useEffect(() => {
    load();
  }, []);

  const renderItem = ({ item }: { item: Article }) => (
    <View style={styles.row}>
      <Text style={styles.title} numberOfLines={2} onPress={() => router.push({ pathname: '/article', params: { id: item.id, feedId: item.feedId } })}>{item.title}</Text>
      <Text style={styles.desc} numberOfLines={1}>{item.link}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={articles}
        keyExtractor={(a) => a.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.empty}>No bookmarks yet</Text>}
        onRefresh={load}
        refreshing={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  row: { paddingVertical: 10 },
  title: { fontSize: 16, fontWeight: '600' },
  desc: { color: '#666' },
  separator: { height: 1, backgroundColor: '#eee' },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
});
