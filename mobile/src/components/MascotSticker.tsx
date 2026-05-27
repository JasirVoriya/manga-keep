import { useEffect, useRef } from 'react';
import { Animated, Easing, ImageSourcePropType, StyleSheet, View, ViewStyle } from 'react-native';
import { radii } from '../styles/constants';
import { useTheme } from '../styles/themeContext';
import type { ThemeTokens } from '../styles/themes/types';

type Props = {
  source: ImageSourcePropType;
  size?: number;
  style?: ViewStyle;
};

export function MascotSticker({ source, size = 82, style }: Props) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });
  const rotate = float.interpolate({
    inputRange: [0, 1],
    outputRange: ['-2deg', '2deg'],
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, style, { transform: [{ translateY }, { rotate }] }]}>
      <View style={[styles.glow, { width: size * 0.82, height: size * 0.82, borderRadius: size }]} />
      <Animated.Image source={source} resizeMode="contain" style={{ width: size, height: size }} />
    </Animated.View>
  );
}

const getStyles = (theme: ThemeTokens) => StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surfaceSoft,
    borderRadius: radii.md,
    shadowColor: theme.brand,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
});
