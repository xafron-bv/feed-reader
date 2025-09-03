import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { loadState } from '@/lib/storage';
import { refreshAllFeeds } from '@/lib/refresh';

export const BACKGROUND_FETCH_TASK = 'rss-reader-background-fetch';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const state = await loadState();
    await refreshAllFeeds(state.feeds);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (e) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundFetchAsync() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
  if (!isRegistered) {
    try {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 15 * 60, // 15 minutes (platform minimum)
        stopOnTerminate: false,
        startOnBoot: true,
      });
    } catch {}
  }
}

export async function unregisterBackgroundFetchAsync() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
  if (isRegistered) {
    try { await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK); } catch {}
  }
}

