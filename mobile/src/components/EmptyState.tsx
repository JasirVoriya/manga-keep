import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../styles/themeContext';
import { ActionButton } from './ActionButton';

interface Props {
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionTitle, onAction }: Props) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.illustrationPlaceholder, { backgroundColor: theme.surfaceSoft }]} />
      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>
      {actionTitle && onAction && (
        <ActionButton title={actionTitle} onPress={onAction} style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  illustrationPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  action: {
    minWidth: 160,
  },
});
