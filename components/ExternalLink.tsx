import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Platform } from 'react-native';

type ExternalHref = `http://${string}` | `https://${string}`;

export function ExternalLink({ href, children }: { href: ExternalHref; children: React.ReactNode }) {
  return (
    <Link
      target="_blank"
      href={href}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          e.preventDefault();
          WebBrowser.openBrowserAsync(href as string);
        }
      }}
    >
      {children}
    </Link>
  );
}
