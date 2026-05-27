import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../styles/themeContext';

export function AboutScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>关于漫集</Text>
      <Text style={{ color: theme.textSecondary, marginTop: 16 }}>版本 1.0.1</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
});
