import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAppContext } from '@/context/AppContext';
import { FeedInfo } from '@/lib/types';
import { Link } from 'expo-router';

export default function FeedsScreen() {
  const { feeds, addFeedByUrl, removeFeed, refreshFeed } = useAppContext();
  const [newFeedUrl, setNewFeedUrl] = useState('');
  usePeriodicRefresh();

  const onAdd = async () => {
    if (!newFeedUrl.trim()) return;
    try {
      await addFeedByUrl(newFeedUrl.trim());
      setNewFeedUrl('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to add feed');
    }
  };

  const onDelete = async (feedId: string) => {
    await removeFeed(feedId);
  };

  const renderItem = ({ item }: { item: FeedInfo }) => (
    <View style={styles.feedRow} testID="feed-row">
      <Link href={{ pathname: '/feed/[id]', params: { id: item.id } }} asChild>
        <View style={{ flex: 1 }}>
          <Text style={styles.feedTitle}>{item.title ?? item.url}</Text>
          {item.description ? (
            <Text style={styles.feedDesc} numberOfLines={1}>{item.description}</Text>
          ) : null}
        </View>
      </Link>
      <Text style={styles.link} onPress={() => onDelete(item.id)}>Delete</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.addRow}>
        <TextInput
          placeholder="https://example.com/feed.xml"
          value={newFeedUrl}
          onChangeText={setNewFeedUrl}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          testID="feed-url-input"
        />
        <Pressable accessibilityRole="button" testID="add-feed-button" onPress={onAdd}>
          <Text style={styles.addButton}>Add</Text>
        </Pressable>
      </View>
      <FlatList
        data={feeds}
        keyExtractor={(f) => f.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.empty}>Add a feed URL to begin</Text>}
        testID="feeds-list"
      />
    </View>
  );
}

function usePeriodicRefresh() {
  const { feeds, refreshFeed } = useAppContext();
  useEffect(() => {
    const id = setInterval(() => {
      feeds.forEach((f) => refreshFeed(f.id).catch(() => {}));
    }, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [feeds, refreshFeed]);
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 10, height: 40 },
  addButton: { color: '#007aff', paddingHorizontal: 8, paddingVertical: 8 },
  feedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  feedTitle: { fontSize: 16, fontWeight: '600' },
  feedDesc: { color: '#666' },
  separator: { height: 1, backgroundColor: '#eee' },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
  link: { color: '#ff3b30', paddingHorizontal: 8, paddingVertical: 8 },
});
