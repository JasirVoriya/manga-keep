import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, radii } from '../styles/theme';

type Props = {
  compact?: boolean;
};

export function AnimatedMangaDecor({ compact = false }: Props) {
  const float = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );

    floatLoop.start();
    pulseLoop.start();

    return () => {
      floatLoop.stop();
      pulseLoop.stop();
    };
  }, [float, pulse]);

  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, compact ? -4 : -9],
  });
  const rotate = float.interpolate({
    inputRange: [0, 1],
    outputRange: ['-4deg', '5deg'],
  });
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.58, 1],
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.panel,
          compact && styles.compactPanel,
          {
            transform: [{ translateY }, { rotate }],
          },
        ]}
      >
        <View style={styles.panelLine} />
        <View style={[styles.panelLine, styles.panelLineShort]} />
        <MaterialCommunityIcons name="book-open-page-variant" size={compact ? 20 : 28} color={colors.redDark} />
      </Animated.View>

      <Animated.View style={[styles.spark, compact && styles.compactSpark, { opacity, transform: [{ scale }] }]}>
        <MaterialCommunityIcons name="star-four-points" size={compact ? 18 : 24} color={colors.gold} />
      </Animated.View>

      <Animated.View
        style={[
          styles.bubble,
          compact && styles.compactBubble,
          {
            opacity,
            transform: [{ translateY }, { scale }],
          },
        ]}
      >
        <View style={styles.bubbleDot} />
        <View style={[styles.bubbleDot, styles.bubbleDotAccent]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 88,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'rgba(124, 45, 18, 0.22)',
    backgroundColor: 'rgba(255, 250, 240, 0.78)',
  },
  compactPanel: {
    right: 10,
    top: 8,
    width: 66,
    height: 44,
  },
  panelLine: {
    position: 'absolute',
    left: 9,
    top: 10,
    width: 34,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(249, 115, 22, 0.42)',
  },
  panelLineShort: {
    top: 17,
    width: 22,
    backgroundColor: 'rgba(225, 29, 72, 0.34)',
  },
  spark: {
    position: 'absolute',
    right: 96,
    top: 13,
  },
  compactSpark: {
    right: 78,
    top: 8,
  },
  bubble: {
    position: 'absolute',
    right: 18,
    bottom: 13,
    width: 42,
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(159, 18, 57, 0.2)',
    backgroundColor: 'rgba(255, 247, 237, 0.7)',
  },
  compactBubble: {
    right: 12,
    bottom: 9,
    width: 34,
    height: 22,
  },
  bubbleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.coral,
  },
  bubbleDotAccent: {
    backgroundColor: colors.red,
  },
});
