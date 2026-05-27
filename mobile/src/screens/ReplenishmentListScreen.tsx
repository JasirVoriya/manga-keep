import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView, ActivityIndicator, Clipboard, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../styles/themeContext';
import { radii } from '../styles/constants';
import { useAppStore } from '../data/appStore';
import { loadRecords } from '../storage/collectionStorage';
import type { IssueRecordMap, OwnershipStatus, ComicIssue, ComicCatalog } from '../types';
import type { ThemeTokens } from '../styles/themes/types';
import { useNavigation } from '@react-navigation/native';
import { SegmentedControl } from '../components/SegmentedControl';

type FilterType = 'all' | 'wishlist_first';

export function ReplenishmentListScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const { catalogs } = useAppStore();

  const [records, setRecords] = useState<IssueRecordMap>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadRecords().then(r => {
      setRecords(r);
      setLoading(false);
    });
  }, []);

  const listData = useMemo(() => {
    let missingCount = 0;
    let wishlistCount = 0;
    const groups: Array<{ catalog: ComicCatalog, items: Array<{ issue: ComicIssue, record: any }> }> = [];

    catalogs.forEach(catalog => {
      const items: Array<{ issue: ComicIssue, record: any }> = [];
      catalog.issues.forEach(issue => {
        const record = records[issue.key];
        if (record?.status === 'missing' || record?.status === 'wishlist') {
          items.push({ issue, record });
          if (record.status === 'missing') missingCount++;
          if (record.status === 'wishlist') wishlistCount++;
        }
      });
      if (items.length > 0) {
        if (filter === 'wishlist_first') {
          items.sort((a, b) => {
            if (a.record.status === 'wishlist' && b.record.status !== 'wishlist') return -1;
            if (b.record.status === 'wishlist' && a.record.status !== 'wishlist') return 1;
            return a.issue.number - b.issue.number;
          });
        }
        groups.push({ catalog, items });
      }
    });

    return { groups, missingCount, wishlistCount };
  }, [catalogs, records, filter]);

  function handleCopyList() {
    if (listData.groups.length === 0) return;
    let text = '==== 漫集 补缺清单 ====\n';
    listData.groups.forEach(group => {
      text += `\n【${group.catalog.name}】\n`;
      group.items.forEach(item => {
        const statusStr = item.record.status === 'wishlist' ? '[想要]' : '[缺本]';
        text += `- ${statusStr} 第 ${item.issue.number} 期: ${item.issue.displayTitle}\n`;
      });
    });
    Clipboard.setString(text);
    Alert.alert('已复制', '清单内容已复制到剪贴板，可以粘贴发给书友或商家了！');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>补缺清单</Text>
          <Text style={styles.headerSubtitle}>
            缺本 {listData.missingCount} 项 · 想要 {listData.wishlistCount} 项 · 涉及 {listData.groups.length} 个目录
          </Text>
        </View>
      </View>

      <View style={styles.filterBar}>
        <SegmentedControl 
          options={[
            { label: '全部补缺', value: 'all' },
            { label: '想要优先', value: 'wishlist_first' }
          ]} 
          value={filter} 
          onChange={setFilter as any} 
        />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.brand} style={{ marginTop: 40 }} />
        ) : listData.groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>当前没有缺本或想要条目。</Text>
            <Text style={styles.emptySubtext}>快去书架上标记缺失的期数吧！</Text>
          </View>
        ) : (
          listData.groups.map(group => (
            <View key={group.catalog.id} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{group.catalog.name}</Text>
                <Text style={styles.groupSubtitle}>{group.items.length} 项待补</Text>
              </View>
              {group.items.map(item => (
                <View key={item.issue.key} style={styles.itemRow}>
                  <Text style={styles.itemNumber}>第 {item.issue.number} 期</Text>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.issue.displayTitle}</Text>
                    {item.record.note ? (
                      <Text style={styles.itemNote} numberOfLines={1}>备注: {item.record.note}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.statusBadge, item.record.status === 'wishlist' ? styles.statusWishlist : styles.statusMissing]}>
                    <Text style={[styles.statusText, item.record.status === 'wishlist' ? styles.statusTextWishlist : styles.statusTextMissing]}>
                      {item.record.status === 'wishlist' ? '想要' : '缺本'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {listData.groups.length > 0 && (
        <View style={styles.footer}>
          <Pressable style={styles.copyButton} onPress={handleCopyList}>
            <MaterialCommunityIcons name="content-copy" size={20} color={theme.textOnBrand} />
            <Text style={styles.copyButtonText}>复制清单文本</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
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
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  groupCard: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: theme.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.surfaceRaised,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: theme.textPrimary,
  },
  groupSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.brand,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  itemNumber: {
    width: 60,
    fontSize: 13,
    fontWeight: '900',
    color: theme.textSecondary,
  },
  itemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: 2,
  },
  itemNote: {
    fontSize: 11,
    color: theme.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  statusWishlist: {
    backgroundColor: theme.wantedSoft,
    borderColor: theme.wanted,
    borderWidth: 1,
  },
  statusMissing: {
    backgroundColor: theme.missingSoft,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  statusTextWishlist: {
    color: theme.wanted,
  },
  statusTextMissing: {
    color: theme.missing,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surface,
  },
  copyButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.md,
    backgroundColor: theme.brand,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.textOnBrand,
  },
});
