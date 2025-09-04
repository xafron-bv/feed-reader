import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Platform, Pressable } from 'react-native';

type ExternalHref = `http://${string}` | `https://${string}`;

export function ExternalLink({ href, children }: { href: ExternalHref; children: React.ReactNode }) {
  const onPress = () => {
    if (Platform.OS === 'web') {
      window.open(href, '_blank');
    } else {
      WebBrowser.openBrowserAsync(href as string);
    }
  };
  return <Pressable onPress={onPress}>{children}</Pressable>;
}
