import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, TextInput } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAppContext } from '@/context/AppContext';
import { Collection, FeedInfo } from '@/lib/types';
import { Link } from 'expo-router';

function generateId(name: string) {
  return Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
}

export default function CollectionsScreen() {
  const { collections, feeds, addOrUpdateCollection, removeCollection } = useAppContext() as any;
  const [local, setLocal] = useState<Collection[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [selectedFeedIds, setSelectedFeedIds] = useState<string[]>([]);

  useEffect(() => {
    setLocal(collections);
  }, [collections]);

  const toggleFeed = (id: string) => {
    setSelectedFeedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openCreate = () => {
    setName('');
    setSelectedFeedIds([]);
    setModalVisible(true);
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Name required');
      return;
    }
    const c: Collection = {
      id: generateId(name),
      name: name.trim(),
      feedIds: selectedFeedIds,
      createdAt: new Date().toISOString(),
    };
    await addOrUpdateCollection(c);
    setModalVisible(false);
  };

  const remove = async (id: string) => {
    await removeCollection(id);
  };

  const renderItem = ({ item }: { item: Collection }) => (
    <View style={styles.row}>
      <Link href={{ pathname: '/collection/[id]', params: { id: item.id } }} asChild>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.desc} numberOfLines={1}>{item.feedIds.length} feeds</Text>
        </View>
      </Link>
      <Pressable onPress={() => remove(item.id)}><Text style={styles.delete}>Delete</Text></Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <Pressable onPress={openCreate}><Text style={styles.add}>+ New Collection</Text></Pressable>
      <FlatList data={local} keyExtractor={(c) => c.id} renderItem={renderItem} ItemSeparatorComponent={() => <View style={styles.separator} />} />

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>New Collection</Text>
          <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />
          <Text style={styles.modalSubtitle}>Select feeds</Text>
          <FlatList
            data={feeds as FeedInfo[]}
            keyExtractor={(f) => f.id}
            renderItem={({ item }) => (
              <Pressable onPress={() => toggleFeed(item.id)} style={styles.feedRow}>
                <Text style={[styles.feedName, selectedFeedIds.includes(item.id) ? styles.selected : null]}>{item.title ?? item.url}</Text>
              </Pressable>
            )}
          />
          <View style={styles.modalActions}>
            <Pressable onPress={() => setModalVisible(false)}><Text style={styles.link}>Cancel</Text></Pressable>
            <Pressable onPress={save}><Text style={styles.link}>Save</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  add: { color: '#007aff', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  title: { fontSize: 16, fontWeight: '600' },
  desc: { color: '#666' },
  delete: { color: '#ff3b30', paddingHorizontal: 8, paddingVertical: 8 },
  separator: { height: 1, backgroundColor: '#eee' },
  modal: { flex: 1, padding: 12, paddingTop: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  modalSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 10, height: 40, marginBottom: 12 },
  feedRow: { paddingVertical: 10 },
  feedName: { fontSize: 16 },
  selected: { fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, paddingVertical: 12 },
  link: { color: '#007aff', paddingHorizontal: 8, paddingVertical: 8 },
});