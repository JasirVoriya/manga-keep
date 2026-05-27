import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../styles/themeContext';
import { ActionButton } from '../components/ActionButton';

export function OnboardingScreen({ navigation }: any) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>欢迎使用漫集</Text>
      <Text style={{ color: theme.textSecondary, marginTop: 16, marginBottom: 40, textAlign: 'center' }}>
        一款轻二次元可爱风的漫画收藏标记工具
      </Text>
      <ActionButton title="开始使用" onPress={() => navigation.replace('Library')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '900' },
});
