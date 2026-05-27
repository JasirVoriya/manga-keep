import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../styles/themeContext';
import { radii } from '../styles/constants';

import type { ImageSourcePropType } from 'react-native';

interface Props {
  source?: ImageSourcePropType;
  uri?: string;
  issueNumber: string;
  style?: StyleProp<ViewStyle>;
}

export function CoverImage({ source, uri, issueNumber, style }: Props) {
  const { theme } = useTheme();
  const [hasError, setHasError] = useState(false);
  
  const finalSource = source || (uri ? { uri } : undefined);

  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }, style]}>
      {finalSource && !hasError ? (
        <Image
          source={finalSource}
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
