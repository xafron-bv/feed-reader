import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAppContext } from '@/context/AppContext';

export default function SettingsScreen() {
  const { settings, setSettings, syncAll } = useAppContext() as any;
  const [enabled, setEnabled] = useState<boolean>(settings?.backgroundSyncEnabled ?? true);
  const [syncing, setSyncing] = useState(false);
  const [intervalStr, setIntervalStr] = useState<string>(String(settings?.syncIntervalMinutes ?? 15));

  useEffect(() => {
    setEnabled(settings?.backgroundSyncEnabled ?? true);
    setIntervalStr(String(settings?.syncIntervalMinutes ?? 15));
  }, [settings?.backgroundSyncEnabled]);

  const onToggle = async (value: boolean) => {
    setEnabled(value);
    await setSettings({ ...settings, backgroundSyncEnabled: value });
  };

  const onSyncNow = async () => {
    setSyncing(true);
    await syncAll();
    setSyncing(false);
  };

  const onIntervalBlur = async () => {
    const parsed = Math.max(1, Math.floor(Number(intervalStr) || 15));
    setIntervalStr(String(parsed));
    await setSettings({ ...settings, syncIntervalMinutes: parsed });
    // Notify SW of new interval
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SET_SYNC_INTERVAL', minutes: parsed });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.title}>Background sync</Text>
        <Switch value={enabled} onValueChange={onToggle} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Sync interval (minutes)</Text>
        <TextInput
          value={intervalStr}
          onChangeText={setIntervalStr}
          onBlur={onIntervalBlur}
          inputMode="numeric"
          keyboardType="numeric"
          style={styles.inputInline}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Last sync</Text>
        <Text style={styles.value}>{settings?.lastSyncAt ? new Date(settings.lastSyncAt).toLocaleString() : 'Never'}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onSyncNow} disabled={syncing}>
        <Text style={styles.link}>{syncing ? 'Syncing…' : 'Sync now'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '600' },
  label: { color: '#666' },
  value: { color: '#333' },
  link: { color: '#007aff', paddingHorizontal: 8, paddingVertical: 8 },
  inputInline: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 10, height: 36, minWidth: 60, textAlign: 'right' },
});