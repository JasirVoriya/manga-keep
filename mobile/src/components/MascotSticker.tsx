import { useEffect, useRef } from 'react';
import { Animated, Easing, ImageSourcePropType, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii } from '../styles/theme';

type Props = {
  source: ImageSourcePropType;
  size?: number;
  style?: ViewStyle;
};

export function MascotSticker({ source, size = 82, style }: Props) {
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

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(216, 155, 114, 0.36)',
    backgroundColor: 'rgba(255, 250, 235, 0.72)',
    borderRadius: radii.md,
    shadowColor: colors.redDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
});
