import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../styles/themeContext';
import { radii } from '../styles/constants';

interface Props {
  uri?: string;
  issueNumber: string;
  style?: StyleProp<ViewStyle>;
}

export function CoverImage({ uri, issueNumber, style }: Props) {
  const { theme } = useTheme();
  const [hasError, setHasError] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }, style]}>
      {uri && !hasError ? (
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <View style={styles.fallback}>
          <Text style={[styles.number, { color: theme.textMuted }]}>{issueNumber}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    aspectRatio: 3 / 4,
    width: '100%',
    borderRadius: radii.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  number: {
    fontSize: 24,
    fontWeight: '900',
  },
});
