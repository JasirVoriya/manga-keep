import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../styles/themeContext';
import { radii } from '../styles/constants';
import type { ThemeTokens } from '../styles/themes/types';
import { useNavigation } from '@react-navigation/native';

const APP_VERSION = '1.0.0 (Build 42)';

export function AboutScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>帮助与关于</Text>
          <Text style={styles.headerSubtitle}>为实体漫画收藏而做的本地记录工具</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>品牌与定位</Text>
          <View style={styles.card}>
            <View style={styles.brandRow}>
              <MaterialCommunityIcons name="bookshelf" size={40} color={theme.brand} />
              <View style={styles.brandTextWrap}>
                <Text style={styles.brandName}>漫集 MangaKeep</Text>
                <Text style={styles.brandVersion}>版本 {APP_VERSION}</Text>
              </View>
            </View>
            <Text style={styles.paragraph}>漫集是一个安静的本地工具，帮助你追踪书架上已有、缺本或想要的实体漫画。</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>使用帮助</Text>
          <View style={styles.card}>
            <HelpItem theme={theme} styles={styles} title="如何标记已有" desc="在书架总览点击一本书，在档案卡中选择「已有」和「品相」。" />
            <HelpItem theme={theme} styles={styles} title="如何查看缺本" desc="打开工具箱中的「补缺清单」，它会自动汇总你的所有缺本和想要条目。" />
            <HelpItem theme={theme} styles={styles} title="如何创建本地目录" desc="如果公共目录找不到你的书，可以在「目录广场」里新建本地目录。" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>数据与离线说明</Text>
          <View style={styles.card}>
            <Text style={styles.paragraph}>你的所有收藏记录、备注和创建的本地目录都会保存在本机。即使没有网络连接，你依然可以查阅和更新所有信息。</Text>
            <Text style={styles.paragraph}>无需注册账号。如果需要转移设备，请前往「导入导出」生成全量备份。</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>公共目录说明</Text>
          <View style={styles.card}>
            <Text style={styles.paragraph}>公共目录来源于网络仓库。应用会自动拉取最新的目录定义，但当网络不佳或仓库宕机时，已经下载的内置目录会作为后备方案，不影响你继续记录数据。</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>应用边界</Text>
          <View style={styles.card}>
            <Text style={styles.paragraph}>为保持简单和克制，本应用：</Text>
            <Text style={styles.listItem}>• 不提供任何漫画电子版阅读功能。</Text>
            <Text style={styles.listItem}>• 不提供盗版下载或资源搜索。</Text>
            <Text style={styles.listItem}>• 不内置二手交易或跳蚤市场。</Text>
            <Text style={styles.listItem}>• 永远不强制要求登录账号。</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.copyright}>© 2026 MangaKeep</Text>
      </View>
    </SafeAreaView>
  );
}

function HelpItem({ theme, styles, title, desc }: { theme: ThemeTokens; styles: any; title: string; desc: string }) {
  return (
    <View style={styles.helpItem}>
      <Text style={styles.helpTitle}>{title}</Text>
      <Text style={styles.helpDesc}>{desc}</Text>
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
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.textPrimary,
    marginLeft: 8,
    marginBottom: 8,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    padding: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  brandTextWrap: {
    flex: 1,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.textPrimary,
  },
  brandVersion: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    marginTop: 4,
  },
  paragraph: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  listItem: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textSecondary,
    lineHeight: 22,
    marginLeft: 8,
    marginBottom: 4,
  },
  helpItem: {
    marginBottom: 16,
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  helpDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  copyright: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textMuted,
  },
});
