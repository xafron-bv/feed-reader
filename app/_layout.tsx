import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { AppProvider } from '@/context/AppContext';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { registerBackgroundFetchAsync } from './background';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppProvider>
        <BackgroundSyncRegistrar />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </AppProvider>
    </ThemeProvider>
  );
}

function useRegisterServiceWorkerRefresh() {
  const { feeds, refreshFeed } = useAppContext();
  const { settings } = useAppContext() as any;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Register native background fetch when running on native
    // On web, window.navigator exists; on native, serviceWorker won't.
    if (!('serviceWorker' in navigator)) {
      if (settings?.backgroundSyncEnabled !== false) registerBackgroundFetchAsync(settings?.syncIntervalMinutes ?? 15).catch(() => {});
    }
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      // Register SW
      const swPath = '/worker.js';
      navigator.serviceWorker.register(swPath).then((reg) => {
        // Send interval to SW
        const minutes = settings?.syncIntervalMinutes ?? 15;
        if (reg.active) reg.active.postMessage({ type: 'SET_SYNC_INTERVAL', minutes });
        // If not active yet, try again after activation
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing || reg.waiting || reg.active;
          if (sw) sw.addEventListener('statechange', () => {
            if (reg.active) reg.active.postMessage({ type: 'SET_SYNC_INTERVAL', minutes });
          });
        });
      }).catch(() => {});
      // Listen for background tick
      navigator.serviceWorker.addEventListener('message', async (event) => {
        if (event.data?.type === 'FEEDS_REFRESH_TICK' && (settings?.backgroundSyncEnabled !== false)) {
          for (const f of feeds) {
            try { await refreshFeed(f.id); } catch {}
          }
        }
      });
    }
  }, [feeds, refreshFeed, settings?.backgroundSyncEnabled, settings?.syncIntervalMinutes]);
}

function BackgroundSyncRegistrar() {
  useRegisterServiceWorkerRefresh();
  return null;
}
