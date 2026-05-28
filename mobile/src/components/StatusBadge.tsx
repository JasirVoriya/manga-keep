import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../styles/themeContext';
import type { OwnershipStatus } from '../types';

interface Props {
  status: OwnershipStatus;
}

export function StatusBadge({ status }: Props) {
  const { theme } = useTheme();

  const getBackgroundColor = () => {
    switch (status) {
      case 'owned': return theme.owned;
      case 'missing': return theme.missing;
      case 'wishlist': return theme.wanted; // Use theme.wanted for wishlist
      default: return 'transparent';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'owned': return '已有';
      case 'missing': return '缺本';
      case 'wishlist': return '想要';
      default: return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <Text style={[styles.text, { color: theme.textOnBrand }]}>{getLabel()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12, // Pill shape
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
