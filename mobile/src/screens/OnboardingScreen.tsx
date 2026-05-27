import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView, useWindowDimensions, Image } from 'react-native';
import { useTheme } from '../styles/themeContext';
import { radii } from '../styles/constants';
import type { ThemeTokens } from '../styles/themes/types';
import { useNavigation } from '@react-navigation/native';

const chibiAssistant = require('../../assets/ui/ai-chibi-collector.png');
const readerGirl = require('../../assets/ui/ai-chibi-reader.png');

const PAGES = [
  {
    id: '1',
    title: '记录实体漫画收藏',
    description: '无论是连载杂志、单行本、画集还是特刊，都能在这里系统归档，让实体书架上的宝贝不再无迹可寻。',
    image: readerGirl
  },
  {
    id: '2',
    title: '看清缺本和想要',
    description: '通过智能颜色和状态管理，快速辨认出哪些是已拥有的珍藏，哪些是仍在寻觅的孤本。',
    image: chibiAssistant
  },
  {
    id: '3',
    title: '本地记录，可备份带走',
    description: '所有核心收藏数据保存在本机，不用担心账号注册或数据丢失。你可以随时导出备份，随心迁移。',
    image: readerGirl
  }
];

export function OnboardingScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  function handleScroll(e: any) {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  }

  function handleNext() {
    if (currentIndex < PAGES.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setCurrentIndex(nextIndex); // UI fallback update
    } else {
      navigation.replace('Library');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>漫集</Text>
          <Text style={styles.brandSubtitle}>MangaKeep</Text>
        </View>
        <Pressable style={styles.skipButton} onPress={() => navigation.replace('Library')}>
          <Text style={styles.skipText}>跳过</Text>
        </Pressable>
      </View>

      <ScrollView 
        ref={scrollRef}
        horizontal 
        pagingEnabled 
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.scrollView}
      >
        {PAGES.map((page) => (
          <View key={page.id} style={[styles.pageContainer, { width }]}>
            <View style={styles.imageWrap}>
              <Image source={page.image} style={styles.image} resizeMode="contain" />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.pageTitle}>{page.title}</Text>
              <Text style={styles.pageDescription}>{page.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {PAGES.map((_, i) => (
            <View 
              key={i} 
              style={[styles.dot, i === currentIndex && styles.activeDot]} 
            />
          ))}
        </View>
        
        {currentIndex === PAGES.length - 1 && (
          <Text style={styles.footerHint}>不用登录，也可以先记录本机收藏</Text>
        )}

        <Pressable style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>
            {currentIndex === PAGES.length - 1 ? '开始记录' : '继续'}
          </Text>
        </Pressable>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.brand,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.textSecondary,
    letterSpacing: 1,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  imageWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  image: {
    width: 200,
    height: 200,
  },
  textWrap: {
    flex: 1,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  pageDescription: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    paddingTop: 16,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.borderStrong,
  },
  activeDot: {
    backgroundColor: theme.brand,
    width: 24,
  },
  footerHint: {
    fontSize: 12,
    color: theme.textMuted,
    fontWeight: '700',
    marginBottom: 16,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: radii.md,
    backgroundColor: theme.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.textOnBrand,
  },
});
