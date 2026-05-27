import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView, TextInput, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../styles/themeContext';
import { radii } from '../styles/constants';
import { useAppStore } from '../data/appStore';
import { SegmentedControl } from '../components/SegmentedControl';
import { loadRecords, saveRecords, mergeRecord, normalizeStatus } from '../storage/collectionStorage';
import type { IssueRecordMap, OwnershipStatus, ComicCatalog } from '../types';
import type { ThemeTokens } from '../styles/themes/types';
import { useNavigation } from '@react-navigation/native';

const targetStatusOptions: Array<{ label: string; value: OwnershipStatus }> = [
  { label: '标为已有', value: 'owned' },
  { label: '标为缺本', value: 'missing' },
  { label: '标为想要', value: 'wishlist' },
];

export function BatchActionScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const { catalogs } = useAppStore();
  
  // 暂时使用默认/第一个目录作为批量操作对象，如果需要也可以传参
  const catalog = catalogs[0]; 
  
  const [records, setRecords] = useState<IssueRecordMap>({});
  const [startNum, setStartNum] = useState('');
  const [endNum, setEndNum] = useState('');
  const [targetStatus, setTargetStatus] = useState<OwnershipStatus>('owned');
  const [overwrite, setOverwrite] = useState(false);

  useEffect(() => {
    loadRecords().then(setRecords);
  }, []);

  const stats = useMemo(() => {
    if (!catalog) return { owned: 0, missing: 0, wishlist: 0 };
    let owned = 0, missing = 0, wishlist = 0;
    catalog.issues.forEach(issue => {
      const status = records[issue.key]?.status;
      if (status === 'owned') owned++;
      if (status === 'wishlist') wishlist++;
    });
    missing = catalog.issueCount - owned;
    return { owned, missing, wishlist };
  }, [catalog, records]);

  const affectedIssues = useMemo(() => {
    if (!catalog) return [];
    const s = parseInt(startNum, 10);
    const e = parseInt(endNum, 10);
    if (isNaN(s) || isNaN(e) || s > e) return [];
    
    return catalog.issues.filter(issue => {
      if (issue.number < s || issue.number > e) return false;
      const currentStatus = records[issue.key]?.status;
      if (!overwrite && currentStatus && currentStatus !== 'missing') {
        // 如果不覆盖且当前有状态（非missing算是有效状态，如果系统默认是missing需要额外判断），简单起见不覆盖有确定状态的
        // 其实应用中默认状态如果没有record就是missing。
        if (currentStatus === 'owned' || currentStatus === 'wishlist') return false;
      }
      return true;
    });
  }, [catalog, startNum, endNum, overwrite, records]);

  async function handleConfirm() {
    if (affectedIssues.length === 0) return;
    
    let nextRecords = { ...records };
    affectedIssues.forEach(issue => {
      const current = nextRecords[issue.key] || { condition: 'ungraded' };
      nextRecords = mergeRecord(nextRecords, issue.number, {
        status: targetStatus,
        condition: normalizeStatus(targetStatus, current.condition as any)
      }, catalog.id);
    });
    
    try {
      await saveRecords(nextRecords);
      setRecords(nextRecords);
      Alert.alert('标记成功', `已更新 ${affectedIssues.length} 本期刊的状态。`, [
        { text: '确定', onPress: () => navigation.goBack() }
      ]);
    } catch {
      Alert.alert('保存失败', '批量标记未能写入本地存储。');
    }
  }

  if (!catalog) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>批量标记</Text>
          <Text style={styles.headerSubtitle}>
            {catalog.name} · 已有 {stats.owned} · 缺本 {stats.missing} · 想要 {stats.wishlist}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>范围设置</Text>
          <View style={styles.rangeRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>从</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={startNum}
                onChangeText={setStartNum}
                placeholder="起始编号"
                placeholderTextColor={theme.textMuted}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>到</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={endNum}
                onChangeText={setEndNum}
                placeholder="结束编号"
                placeholderTextColor={theme.textMuted}
              />
            </View>
          </View>
          
          <Text style={styles.sectionTitle}>目标状态</Text>
          <SegmentedControl options={targetStatusOptions} value={targetStatus} onChange={setTargetStatus} />
          
          <Pressable 
            style={styles.switchRow} 
            onPress={() => setOverwrite(!overwrite)}
          >
            <MaterialCommunityIcons 
              name={overwrite ? "checkbox-marked" : "checkbox-blank-outline"} 
              size={22} 
              color={overwrite ? theme.danger : theme.textMuted} 
            />
            <Text style={[styles.switchLabel, overwrite && { color: theme.danger }]}>
              覆盖已有状态 (这会改写该范围内已经标记过的条目)
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>预览影响 ({affectedIssues.length} 项)</Text>
          {affectedIssues.length === 0 ? (
            <Text style={styles.emptyPreview}>该范围内没有符合条件的条目</Text>
          ) : (
            affectedIssues.slice(0, 10).map(issue => (
              <View key={issue.key} style={styles.previewRow}>
                <Text style={styles.previewTitle} numberOfLines={1}>第 {issue.number} 期: {issue.displayTitle}</Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color={theme.textMuted} />
                <Text style={styles.previewStatus}>{targetStatus === 'owned' ? '已有' : targetStatus === 'missing' ? '缺本' : '想要'}</Text>
              </View>
            ))
          )}
          {affectedIssues.length > 10 && (
            <Text style={styles.previewMore}>... 以及其他 {affectedIssues.length - 10} 项</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerSummary}>将更新 {affectedIssues.length} 项</Text>
        <View style={styles.footerActions}>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>取消</Text>
          </Pressable>
          <Pressable 
            style={[styles.primaryButton, affectedIssues.length === 0 && styles.disabledButton]} 
            onPress={handleConfirm}
            disabled={affectedIssues.length === 0}
          >
            <Text style={styles.primaryButtonText}>确认标记</Text>
          </Pressable>
        </View>
      </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.textPrimary,
    marginBottom: 12,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.textSecondary,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    backgroundColor: theme.surfaceRaised,
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textSecondary,
    flex: 1,
  },
  emptyPreview: {
    fontSize: 14,
    color: theme.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  previewTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  previewStatus: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.brand,
    marginLeft: 8,
  },
  previewMore: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surface,
  },
  footerSummary: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.textPrimary,
  },
  primaryButton: {
    flex: 2,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: theme.brand,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.textOnBrand,
  },
});
