import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../styles/themeContext';
import { useAppStore } from '../data/appStore';
import { ActionButton } from '../components/ActionButton';
import { EmptyState } from '../components/EmptyState';

export function CatalogCenterScreen() {
  const { theme } = useTheme();
  const { catalogs, isLoading, loadCatalogs } = useAppStore();

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>目录中心</Text>
      {catalogs.length === 0 ? (
        <EmptyState 
          title="暂无目录" 
          description="你还没有添加任何漫画目录，请点击下方按钮加载。" 
          actionTitle="加载目录" 
          onAction={loadCatalogs} 
        />
      ) : (
        <FlatList
          data={catalogs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: 'bold' }}>{item.name}</Text>
              <Text style={{ color: theme.textSecondary, marginTop: 4 }}>ID: {item.id}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  list: { paddingBottom: 40 },
  card: { padding: 16, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
});
