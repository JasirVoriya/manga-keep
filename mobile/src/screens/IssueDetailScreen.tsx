import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../styles/themeContext';

export function IssueDetailScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>条目详情</Text>
      <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
        档案卡式设计将在这里呈现单本漫画的详细状态和编辑功能。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold' },
});
