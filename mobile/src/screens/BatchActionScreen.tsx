import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView, TextInput, Alert, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../styles/themeContext';
import { radii } from '../styles/constants';
import { useAppStore } from '../data/appStore';
import { BottomNavBar } from '../components/BottomNavBar';
import { defaultCatalog } from '../data/catalogs';
import { loadRecords, saveRecords, mergeRecord, normalizeStatus } from '../storage/collectionStorage';
import type { IssueRecordMap, OwnershipStatus } from '../types';
import type { ThemeTokens } from '../styles/themes/types';
import { useNavigation } from '@react-navigation/native';

const targetStatusOptions: Array<{ label: string; value: OwnershipStatus }> = [
  { label: '标为已有', value: 'owned' },
  { label: '标为缺本', value: 'missing' },
  { label: '标为想要', value: 'wishlist' },
];

const assistant = require('../../assets/ui/ai-chibi-collector.png');
const reader = require('../../assets/ui/ai-chibi-reader.png');

function statusText(status: OwnershipStatus | undefined) {
  if (status === 'owned') return '已有';
  if (status === 'wishlist') return '想要';
  if (status === 'missing') return '缺本';
  return '未标记';
}

export function BatchActionScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const { catalogs } = useAppStore();

  const catalog = catalogs[0] ?? defaultCatalog;

  const [records, setRecords] = useState<IssueRecordMap>({});
  const [startNum, setStartNum] = useState('');
  const [endNum, setEndNum] = useState('');
  const [targetStatus, setTargetStatus] = useState<OwnershipStatus>('owned');
  const [overwrite, setOverwrite] = useState(false);

  useEffect(() => {
    loadRecords().then(setRecords);
  }, []);

  const stats = useMemo(() => {
    let owned = 0, missing = 0, wishlist = 0, unmarked = 0;
    catalog.issues.forEach(issue => {
      const status = records[issue.key]?.status;
      if (status === 'owned') owned++;
      if (status === 'wishlist') wishlist++;
      if (status === 'missing') missing++;
      if (!status) unmarked++;
    });
    return { owned, missing, wishlist, unmarked };
  }, [catalog, records]);

  const affectedIssues = useMemo(() => {
    const s = parseInt(startNum, 10);
    const e = parseInt(endNum, 10);
    if (isNaN(s) || isNaN(e) || s > e) return [];

    return catalog.issues.filter(issue => {
      if (issue.number < s || issue.number > e) return false;
      const currentStatus = records[issue.key]?.status;
      if (!overwrite && currentStatus && currentStatus !== 'missing') {
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

  const targetLabel = statusText(targetStatus);
  const ownedPercent = Math.min(100, (stats.owned / Math.max(1, catalog.issueCount)) * 100);
  const missingPercent = Math.min(100, (stats.missing / Math.max(1, catalog.issueCount)) * 100);
  const wantedPercent = Math.min(100, (stats.wishlist / Math.max(1, catalog.issueCount)) * 100);

  function selectUnmarkedRange() {
    const issues = catalog.issues.filter((issue) => !records[issue.key]?.status);
    if (issues.length === 0) return;
    setStartNum(String(issues[0].number).padStart(catalog.numberPadding, '0'));
    setEndNum(String(issues[issues.length - 1].number).padStart(catalog.numberPadding, '0'));
    setOverwrite(false);
  }

  function selectMissingRange() {
    const issues = catalog.issues.filter((issue) => records[issue.key]?.status === 'missing');
    if (issues.length === 0) return;
    setStartNum(String(issues[0].number).padStart(catalog.numberPadding, '0'));
    setEndNum(String(issues[issues.length - 1].number).padStart(catalog.numberPadding, '0'));
    setOverwrite(true);
  }

  function resetRange() {
    setStartNum('');
    setEndNum('');
    setOverwrite(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={styles.heroCard}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="返回">
            <MaterialCommunityIcons name="chevron-left" size={24} color={theme.textPrimary} />
          </Pressable>
          <Text style={styles.heroTitle}>批量标记</Text>
          <View style={styles.statGrid}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="format-list-bulleted" size={18} color={theme.textSecondary} />
              <Text style={styles.statText}>总数：{catalog.issueCount}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="checkbox-blank-circle-outline" size={18} color={theme.missing} />
              <Text style={styles.statText}>缺本：{stats.missing}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="circle-slice-8" size={18} color={theme.info} />
              <Text style={styles.statText}>未标：{stats.unmarked}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="heart-outline" size={18} color={theme.wanted} />
              <Text style={styles.statText}>想要：{stats.wishlist}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="star-outline" size={18} color={theme.owned} />
              <Text style={styles.statText}>已有：{stats.owned}</Text>
            </View>
          </View>
          <View style={styles.summaryTrack}>
            <View style={[styles.summaryOwned, { width: `${ownedPercent}%` }]} />
            <View style={[styles.summaryMissing, { width: `${missingPercent}%` }]} />
            <View style={[styles.summaryWanted, { width: `${wantedPercent}%` }]} />
          </View>
          <Image source={assistant} resizeMode="contain" style={styles.heroMascot} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>范围选择</Text>
          <View style={styles.rangeRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>从</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={startNum}
                onChangeText={setStartNum}
                placeholder="输入 001"
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
                placeholder="输入 200"
                placeholderTextColor={theme.textMuted}
              />
            </View>
          </View>
          <View style={styles.quickRow}>
            <Pressable style={[styles.quickButton, styles.blueButton]} onPress={selectUnmarkedRange}>
              <Text style={styles.quickText}>选择未标记</Text>
            </Pressable>
            <Pressable style={[styles.quickButton, styles.greenButton]} onPress={selectMissingRange}>
              <Text style={styles.quickText}>选择缺本</Text>
            </Pressable>
            <Pressable style={styles.resetButton} onPress={resetRange}>
              <MaterialCommunityIcons name="restore" size={17} color={theme.textPrimary} />
              <Text style={styles.resetText}>重置</Text>
            </Pressable>
          </View>

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
          <Text style={styles.sectionTitle}>设置目标状态</Text>
          <View style={styles.targetWrap}>
            {targetStatusOptions.map((option, index) => {
              const active = targetStatus === option.value;
              const mascot = index === 0 ? reader : assistant;
              const bg = option.value === 'owned' ? theme.dangerSoft : option.value === 'missing' ? theme.warningSoft : theme.surfaceRaised;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setTargetStatus(option.value)}
                  style={[styles.targetItem, { backgroundColor: bg }, active && styles.targetActive]}
                >
                  <Image source={mascot} resizeMode="contain" style={styles.targetMascot} />
                  <Text style={styles.targetText}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>范围预览</Text>
          {affectedIssues.length === 0 ? (
            <Text style={styles.emptyPreview}>该范围内没有符合条件的条目</Text>
          ) : (
            affectedIssues.slice(0, 8).map(issue => (
              <View key={issue.key} style={styles.previewRow}>
                <Text style={styles.previewNumber}>{String(issue.number).padStart(catalog.numberPadding, '0')}</Text>
                <Text style={styles.previewCurrent}>({statusText(records[issue.key]?.status)})</Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color={theme.textMuted} />
                <Text style={styles.previewStatus}>{targetLabel}</Text>
              </View>
            ))
          )}
          {affectedIssues.length > 8 && (
            <Text style={styles.previewMore}>以及其他 {affectedIssues.length - 8} 项</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.floatingFooter}>
        <View style={styles.footerInner}>
          <Text style={styles.footerSummary}>将更新 {affectedIssues.length} 项</Text>
          <View style={styles.footerActions}>
            <Pressable
              style={[styles.primaryButton, affectedIssues.length === 0 && styles.disabledButton]}
              onPress={handleConfirm}
              disabled={affectedIssues.length === 0}
            >
              <Text style={styles.primaryButtonText}>确认</Text>
            </Pressable>
          </View>
        </View>
      </View>
      <BottomNavBar />
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
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 1,
    padding: 8,
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
    padding: 14,
  },
  heroCard: {
    minHeight: 224,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surface,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  heroTitle: {
    color: theme.textPrimary,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 18,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingRight: 54,
  },
  statItem: {
    minWidth: '42%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  summaryTrack: {
    height: 13,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: theme.surfaceSoft,
    marginTop: 20,
  },
  summaryOwned: {
    height: '100%',
    backgroundColor: '#c9dff1',
  },
  summaryMissing: {
    height: '100%',
    backgroundColor: '#ffc47d',
  },
  summaryWanted: {
    height: '100%',
    backgroundColor: '#e2a3a4',
  },
  heroMascot: {
    position: 'absolute',
    right: 12,
    bottom: 4,
    width: 72,
    height: 72,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    padding: 16,
    marginBottom: 14,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    color: theme.textPrimary,
    marginBottom: 12,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 14,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: -7,
    marginLeft: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    backgroundColor: theme.surface,
    zIndex: 1,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    backgroundColor: theme.surfaceRaised,
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  quickButton: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xxl,
    paddingHorizontal: 8,
  },
  blueButton: {
    backgroundColor: '#c9dff1',
  },
  greenButton: {
    backgroundColor: '#c8ead7',
  },
  quickText: {
    color: theme.textPrimary,
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
    fontWeight: '900',
  },
  resetButton: {
    width: 84,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: theme.brand,
    backgroundColor: theme.surface,
  },
  resetText: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textSecondary,
    flex: 1,
  },
  targetWrap: {
    flexDirection: 'row',
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  targetItem: {
    flex: 1,
    minHeight: 116,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 10,
  },
  targetActive: {
    borderColor: theme.borderStrong,
  },
  targetMascot: {
    width: 48,
    height: 48,
    marginBottom: 4,
  },
  targetText: {
    color: theme.textPrimary,
    fontSize: 14,
    lineHeight: 17,
    textAlign: 'center',
    fontWeight: '900',
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
    gap: 12,
    paddingVertical: 6,
  },
  previewNumber: {
    width: 42,
    fontSize: 18,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  previewCurrent: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    color: theme.textPrimary,
  },
  previewStatus: {
    minWidth: 72,
    borderRadius: 16,
    overflow: 'hidden',
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: '#e2a3a4',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '900',
    color: theme.textPrimary,
  },
  previewMore: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
  floatingFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.owned,
  },
  footerInner: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  footerSummary: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: theme.textOnBrand,
  },
  footerActions: {
    flexDirection: 'row',
  },
  primaryButton: {
    minWidth: 112,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.brand,
    backgroundColor: theme.surface,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.textPrimary,
  },
});
