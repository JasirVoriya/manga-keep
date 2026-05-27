import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../styles/themeContext';
import { radii } from '../styles/constants';
import type { ComicIssue, IssueRecord } from '../types';
import { CoverImage } from './CoverImage';
import { StatusBadge } from './StatusBadge';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  issue: ComicIssue;
  record: IssueRecord;
  selected?: boolean;
  width: number;
  onPress: () => void;
  onLongPress: () => void;
};

export function IssueCard({ issue, record, selected = false, width, onPress, onLongPress }: Props) {
  const { theme } = useTheme();
  const isMissing = record.status === 'missing';
  
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.card,
        { width },
        selected && { transform: [{ scale: 0.95 }] }
      ]}
    >
      <View style={[
        styles.coverFrame,
        { 
          backgroundColor: theme.surface, 
          borderColor: selected ? theme.brand : theme.border,
          borderWidth: selected ? 2 : 1
        }
      ]}>
        <CoverImage 
          source={issue.cover as any}
          uri={issue.coverUrl}
          issueNumber={issue.number.toString()}
          style={isMissing ? { opacity: 0.5 } : {}}
        />
        {selected && (
          <View style={[styles.selectedMark, { backgroundColor: theme.brand }]}>
            <MaterialCommunityIcons name="check-bold" size={15} color={theme.textOnBrand} />
          </View>
        )}
      </View>
      <View style={styles.footer}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.textPrimary }]}>
          {issue.label}
        </Text>
        <StatusBadge status={record.status as any} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  coverFrame: {
    borderRadius: radii.sm,
    padding: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    marginBottom: 8,
  },
  footer: {
    gap: 4,
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  selectedMark: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
});
