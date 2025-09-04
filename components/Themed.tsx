/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import { Text as DefaultText, View as DefaultView } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

export function Text(props: TextProps) {
  const p: any = props || {};
  const color = useThemeColor({ light: p.lightColor, dark: p.darkColor }, 'text');
  const otherProps: any = {};
  for (const key in p) {
    if (key !== 'lightColor' && key !== 'darkColor' && key !== 'style') otherProps[key] = p[key];
  }
  return <DefaultText style={[{ color }, p.style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const p: any = props || {};
  const backgroundColor = useThemeColor({ light: p.lightColor, dark: p.darkColor }, 'background');
  const otherProps: any = {};
  for (const key in p) {
    if (key !== 'lightColor' && key !== 'darkColor' && key !== 'style') otherProps[key] = p[key];
  }
  return <DefaultView style={[{ backgroundColor }, p.style]} {...otherProps} />;
}
