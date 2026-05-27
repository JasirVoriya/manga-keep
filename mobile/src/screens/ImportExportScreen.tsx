import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView, Alert, Clipboard } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../styles/themeContext';
import { radii } from '../styles/constants';
import { useAppStore } from '../data/appStore';
import { loadRecords, saveRecords } from '../storage/collectionStorage';
import { loadLocalCatalogDefinitions, upsertLocalCatalogDefinition } from '../storage/localCatalogStorage';
import type { ThemeTokens } from '../styles/themes/types';
import { useNavigation } from '@react-navigation/native';

export function ImportExportScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const { catalogs, loadCatalogs } = useAppStore();

  const [recordCount, setRecordCount] = useState(0);
  const localCatalogsCount = catalogs.filter(c => c.source.type === 'local').length;

  useEffect(() => {
    loadRecords().then(r => setRecordCount(Object.keys(r).length));
  }, []);

  async function handleExportRecords() {
    try {
      const records = await loadRecords();
      const text = JSON.stringify(records, null, 2);
      Clipboard.setString(text);
      Alert.alert('导出成功', '收藏记录 JSON 已复制到剪贴板。');
    } catch {
      Alert.alert('导出失败', '无法读取收藏记录。');
    }
  }

  async function handleExportCatalogs() {
    try {
      const definitions = await loadLocalCatalogDefinitions();
      const text = JSON.stringify(definitions, null, 2);
      Clipboard.setString(text);
      Alert.alert('导出成功', '本地目录 JSON 已复制到剪贴板。');
    } catch {
      Alert.alert('导出失败', '无法读取本地目录定义。');
    }
  }

  async function handleExportBackup() {
    try {
      const records = await loadRecords();
      const definitions = await loadLocalCatalogDefinitions();
      const backup = { records, catalogs: definitions };
      const text = JSON.stringify(backup, null, 2);
      Clipboard.setString(text);
      Alert.alert('备份成功', '完整备份 JSON 已复制到剪贴板。你可以将其保存在备忘录或文件中。');
    } catch {
      Alert.alert('导出失败', '完整备份创建失败。');
    }
  }

  async function handleImportBackup() {
    const text = await Clipboard.getString();
    if (!text) {
      Alert.alert('导入失败', '剪贴板为空。请先复制 JSON 数据。');
      return;
    }
    try {
      const backup = JSON.parse(text);
      if (backup.records) {
        await saveRecords(backup.records);
      }
      if (backup.catalogs && Array.isArray(backup.catalogs)) {
        for (const def of backup.catalogs) {
          await upsertLocalCatalogDefinition(def);
        }
      }
      if (!backup.records && !backup.catalogs) {
        // 尝试按纯 records 解析
        await saveRecords(backup);
      }
      
      Alert.alert('导入成功', '数据已经成功恢复。');
      loadRecords().then(r => setRecordCount(Object.keys(r).length));
      loadCatalogs();
    } catch {
      Alert.alert('解析失败', '无法识别剪贴板中的数据，请确保是有效的备份 JSON。');
    }
  }

  function handleClearData() {
    Alert.alert(
      '高危操作',
      '确认要清空所有收藏记录吗？此操作不可逆！请确保你已经导出备份。',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '清空', 
          style: 'destructive',
          onPress: async () => {
            await saveRecords({});
            setRecordCount(0);
            Alert.alert('已清空', '所有收藏记录已被清空。');
          }
        }
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>导入导出与备份</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* 数据摘要 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{recordCount}</Text>
            <Text style={styles.summaryLabel}>收藏记录</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{localCatalogsCount}</Text>
            <Text style={styles.summaryLabel}>本地目录</Text>
          </View>
        </View>

        {/* 导出分组 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>导出</Text>
          
          <ActionCard 
            theme={theme} styles={styles}
            title="导出收藏记录" 
            desc="只导出标记过的已有、缺本和想要数据。"
            buttonText="复制记录 JSON"
            onPress={handleExportRecords}
          />
          <ActionCard 
            theme={theme} styles={styles}
            title="导出本地目录定义" 
            desc="只导出你手动创建的非公共目录数据。"
            buttonText="复制目录 JSON"
            onPress={handleExportCatalogs}
          />
          <ActionCard 
            theme={theme} styles={styles}
            title="导出完整备份" 
            desc="包含收藏记录和本地目录，推荐用于跨设备迁移。"
            buttonText="复制完整备份 JSON"
            isPrimary
            onPress={handleExportBackup}
          />
        </View>

        {/* 导入分组 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>导入</Text>
          <ActionCard 
            theme={theme} styles={styles}
            title="从剪贴板导入数据" 
            desc="自动解析并合并剪贴板里的记录或完整备份JSON数据。"
            buttonText="从剪贴板导入"
            icon="clipboard-arrow-down-outline"
            onPress={handleImportBackup}
          />
        </View>

        {/* 恢复与清理 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleDanger}>恢复与清理</Text>
          <View style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>清空收藏记录</Text>
            <Text style={styles.dangerDesc}>删除本机所有的已有、缺本和想要状态，恢复到初始空白状态。不会删除你的本地目录。</Text>
            <Pressable style={styles.dangerButton} onPress={handleClearData}>
              <Text style={styles.dangerButtonText}>清空所有记录</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({ theme, styles, title, desc, buttonText, icon = "content-copy", isPrimary = false, onPress }: any) {
  return (
    <View style={styles.actionCard}>
      <View style={styles.actionInfo}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDesc}>{desc}</Text>
      </View>
      <Pressable style={[styles.actionButton, isPrimary && styles.actionButtonPrimary]} onPress={onPress}>
        <MaterialCommunityIcons name={icon} size={16} color={isPrimary ? theme.textOnBrand : theme.brand} />
        <Text style={[styles.actionButtonText, isPrimary && styles.actionButtonTextPrimary]}>{buttonText}</Text>
      </Pressable>
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
  content: {
    flex: 1,
  },
  summaryCard: {
    margin: 16,
    padding: 24,
    borderRadius: radii.md,
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.brand,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.textSecondary,
    marginTop: 4,
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
  sectionTitleDanger: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.danger,
    marginLeft: 16,
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: theme.surface,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border,
    marginBottom: -1, 
  },
  actionInfo: {
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    lineHeight: 20,
  },
  actionButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  actionButtonPrimary: {
    backgroundColor: theme.brand,
    borderColor: theme.brand,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  actionButtonTextPrimary: {
    color: theme.textOnBrand,
  },
  dangerCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: radii.md,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.dangerSoft,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.danger,
    marginBottom: 4,
  },
  dangerDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  dangerButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: theme.dangerSoft,
    borderWidth: 1,
    borderColor: theme.danger,
  },
  dangerButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.danger,
  },
});
