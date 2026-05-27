import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../styles/themeContext';
import { radii } from '../styles/constants';
import { useAppStore } from '../data/appStore';
import { LocalCatalogEditorModal } from '../components/LocalCatalogEditorModal';
import { upsertLocalCatalogDefinition } from '../storage/localCatalogStorage';
import type { ThemeTokens } from '../styles/themes/types';
import type { ComicCatalog, StoredComicCatalogDefinition } from '../types';
import { useNavigation } from '@react-navigation/native';

export function CatalogCenterScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const { catalogs, isLoading, publicCatalogLoadFailed, loadCatalogs } = useAppStore();
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  const publicCatalogs = catalogs.filter(c => c.source.type !== 'local');
  const localCatalogs = catalogs.filter(c => c.source.type === 'local');

  async function handleCreateCatalog(definition: StoredComicCatalogDefinition) {
    try {
      await upsertLocalCatalogDefinition(definition);
      setEditorOpen(false);
      loadCatalogs();
    } catch {
      Alert.alert('保存失败', '目录没有写入本地存储，请稍后再试。');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>目录中心</Text>
          <Text style={styles.headerSubtitle}>管理用于识别和补全实体出版物的目录</Text>
        </View>
        <Pressable onPress={loadCatalogs} style={styles.refreshButton}>
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.brand} />
          ) : (
            <MaterialCommunityIcons name="refresh" size={24} color={theme.brand} />
          )}
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {/* 状态摘要 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{catalogs.length}</Text>
            <Text style={styles.summaryLabel}>可用目录</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{localCatalogs.length}</Text>
            <Text style={styles.summaryLabel}>本地目录</Text>
          </View>
          {publicCatalogLoadFailed && (
            <View style={styles.warningBadge}>
              <MaterialCommunityIcons name="alert-circle-outline" size={14} color={theme.danger} />
              <Text style={styles.warningText}>公共目录加载失败</Text>
            </View>
          )}
        </View>

        {/* 官方与公共目录 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>官方与公共目录</Text>
          {publicCatalogs.map(catalog => (
            <CatalogItem key={catalog.id} catalog={catalog} theme={theme} styles={styles} />
          ))}
        </View>

        {/* 本地目录 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>本地目录</Text>
          {localCatalogs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>还没有本地目录</Text>
            </View>
          ) : (
            localCatalogs.map(catalog => (
              <CatalogItem key={catalog.id} catalog={catalog} theme={theme} styles={styles} />
            ))
          )}
        </View>
      </ScrollView>

      {/* 底部操作区 */}
      <View style={styles.footer}>
        <Pressable style={styles.primaryButton} onPress={() => setEditorOpen(true)}>
          <MaterialCommunityIcons name="plus-circle-outline" size={18} color={theme.textOnBrand} />
          <Text style={styles.primaryButtonText}>新建本地目录</Text>
        </Pressable>
      </View>

      <LocalCatalogEditorModal
        visible={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleCreateCatalog}
      />
    </SafeAreaView>
  );
}

function CatalogItem({ catalog, theme, styles }: { catalog: ComicCatalog; theme: ThemeTokens; styles: any }) {
  const isLocal = catalog.source.type === 'local';
  return (
    <View style={styles.catalogCard}>
      <View style={styles.catalogInfo}>
        <Text style={styles.catalogName}>{catalog.name}</Text>
        <Text style={styles.catalogMeta}>
          {isLocal ? '本地目录' : '内置目录'} · {catalog.kind} · {catalog.issueCount} 期
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: theme.surfaceSoft }]}>
        <Text style={[styles.statusText, { color: theme.textSecondary }]}>已启用</Text>
      </View>
    </View>
  );
}

const getStyles = (theme: ThemeTokens) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    margin: 16,
    padding: 16,
    borderRadius: radii.md,
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.brand,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    marginTop: 4,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: theme.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.danger,
    marginLeft: 'auto',
  },
  warningText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.danger,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.textPrimary,
    marginLeft: 16,
    marginBottom: 12,
  },
  catalogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: radii.md,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  catalogInfo: {
    flex: 1,
  },
  catalogName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  catalogMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    padding: 24,
    marginHorizontal: 16,
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: theme.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surface,
  },
  primaryButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.md,
    backgroundColor: theme.brand,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.textOnBrand,
  },
});
