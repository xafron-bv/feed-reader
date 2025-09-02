type ColorSchemeName = 'light' | 'dark' | null | undefined;

// Provide a test-safe wrapper that lazily requires react-native.
// This avoids importing RN modules after the Jest environment has torn down.
export function useColorScheme(): ColorSchemeName {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rn = require('react-native') as { useColorScheme?: () => ColorSchemeName };
    return rn.useColorScheme ? rn.useColorScheme() : 'light';
  } catch {
    return 'light';
  }
}
