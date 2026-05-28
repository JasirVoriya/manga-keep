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
          shadowColor: theme.shadow,
        }
      ]}>
        <CoverImage
          source={issue.cover as any}
          uri={issue.coverUrl}
          issueNumber={issue.number.toString()}
          style={isMissing ? { opacity: 0.5, borderRadius: radii.md } : { borderRadius: radii.md }}
        />

        {/* Floating status badge top-right */}
        <View style={styles.floatingBadge}>
          <StatusBadge status={record.status} />
        </View>

        {/* Selected Overlay */}
        {selected && (
          <View style={[styles.selectedOverlay, { backgroundColor: 'rgba(255,255,255,0.4)', borderColor: theme.brand, borderWidth: 3 }]}>
            <View style={[styles.selectedMark, { backgroundColor: theme.brand }]}>
              <MaterialCommunityIcons name="check-bold" size={15} color={theme.textOnBrand} />
            </View>
          </View>
        )}
      </View>
      <View style={styles.footer}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.textPrimary }]}>
          {issue.label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
  },
  coverFrame: {
    borderRadius: radii.md,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden', // to ensure cover border radius matches
  },
  floatingBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedMark: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
