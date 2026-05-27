import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../styles/themeContext';
import { radii } from '../styles/constants';

type StatusType = 'owned' | 'missing' | 'wanted' | 'unmarked';

interface Props {
  status: StatusType;
}

export function StatusBadge({ status }: Props) {
  const { theme } = useTheme();

  if (status === 'unmarked') return null;

  const getBackgroundColor = () => {
    switch (status) {
      case 'owned': return theme.owned;
      case 'missing': return theme.missing;
      case 'wanted': return theme.wanted;
      default: return 'transparent';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'owned': return '已有';
      case 'missing': return '缺本';
      case 'wanted': return '想要';
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});
