import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, Image, Modal, Text as RNText } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAppContext } from '@/context/AppContext';
import { FeedInfo } from '@/lib/types';
import { Link, router } from 'expo-router';

export default function FeedsScreen() {
  const { feeds, addFeedByUrl, removeFeed, refreshFeed, updateFeedInfo } = useAppContext() as any;
  const { settings } = useAppContext() as any;
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editingFeed, setEditingFeed] = useState<FeedInfo | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
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

  const onDelete = async (feedId: string) => { await removeFeed(feedId); };

  const openEdit = (feed: FeedInfo) => {
    if (!editMode) return;
    setEditingFeed(feed);
    setEditTitle(feed.title || '');
    setEditDesc(feed.description || '');
  };
  const saveEdit = async () => {
    if (!editingFeed) return;
    await updateFeedInfo(editingFeed.id, { title: editTitle || undefined, description: editDesc || undefined });
    setEditingFeed(null);
    setEditTitle('');
    setEditDesc('');
  };
  const deleteFromEdit = async () => {
    if (!editingFeed) return;
    await removeFeed(editingFeed.id);
    setEditingFeed(null);
  };
  const exitEditMode = () => setEditMode(false);

  const renderItem = ({ item }: { item: FeedInfo }) => {
    if (item.isLoading) {
      return (
        <View style={styles.feedRow} testID="feed-row-loading">
          <ActivityIndicator size="small" style={{ marginRight: 8 }} />
          <Text style={styles.feedTitle}>Adding feed…</Text>
        </View>
      );
    }
    return (
      <View style={styles.feedRow} testID="feed-row">
        {item.faviconUrl ? (
          <Image source={{ uri: item.faviconUrl }} style={styles.favicon} testID="feed-favicon" />
        ) : null}
        <Pressable accessibilityRole="button" testID="feed-open" onPress={() => (editMode ? openEdit(item) : router.push({ pathname: '/feed/[id]', params: { id: item.id } }))} style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.feedTitle}>{item.title ?? item.url}</Text>
            {item.description ? (
              <Text style={styles.feedDesc} numberOfLines={1}>{item.description}</Text>
            ) : null}
          </View>
        </Pressable>
      </View>
    );
  };

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
        <Pressable accessibilityRole="button" testID="toggle-edit-mode" onPress={() => setEditMode((v) => !v)}>
          <Text style={styles.addButton}>{editMode ? 'Done' : 'Edit'}</Text>
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
      {editMode ? (
        <View style={styles.editBanner} testID="edit-mode-banner">
          <Text style={styles.editBannerText}>Edit mode</Text>
        </View>
      ) : null}
      <Modal transparent visible={!!editingFeed} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="feed-edit-modal">
            <Text style={styles.modalTitle}>Edit feed</Text>
            <TextInput placeholder="Title" value={editTitle} onChangeText={setEditTitle} style={styles.input} testID="feed-edit-title" />
            <TextInput placeholder="Description" value={editDesc} onChangeText={setEditDesc} style={styles.input} testID="feed-edit-description" />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Pressable onPress={() => setEditingFeed(null)}><Text style={styles.link}>Cancel</Text></Pressable>
              <Pressable onPress={saveEdit}><Text style={styles.link} testID="feed-edit-save">Save</Text></Pressable>
              <Pressable onPress={deleteFromEdit}><Text style={[styles.link, { color: '#ff3b30' }]} testID="feed-edit-delete">Delete</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function usePeriodicRefresh() {
  const { feeds, refreshFeed } = useAppContext();
  const { settings } = useAppContext() as any;
  useEffect(() => {
    const minutes = Math.max(1, Math.floor(settings?.syncIntervalMinutes ?? 15));
    const id = setInterval(() => {
      if (settings?.backgroundSyncEnabled !== false) feeds.forEach((f) => refreshFeed(f.id).catch(() => {}));
    }, minutes * 60 * 1000);
    return () => clearInterval(id);
  }, [feeds, refreshFeed, settings?.backgroundSyncEnabled, settings?.syncIntervalMinutes]);
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 10, height: 40 },
  addButton: { color: '#007aff', paddingHorizontal: 8, paddingVertical: 8 },
  feedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  favicon: { width: 20, height: 20, marginRight: 8, borderRadius: 4 },
  feedTitle: { fontSize: 16, fontWeight: '600' },
  feedDesc: { color: '#666' },
  separator: { height: 1, backgroundColor: '#eee' },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
  link: { color: '#007aff', paddingHorizontal: 8, paddingVertical: 8 },
  editBanner: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#eee' },
  editBannerText: { fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '90%', maxWidth: 400, padding: 16, borderRadius: 8, backgroundColor: '#fff', gap: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
});
