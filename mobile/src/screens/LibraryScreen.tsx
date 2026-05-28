import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  NativeSyntheticEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type DimensionValue,
  type NativeTouchEvent,
} from 'react-native';
import { BottomNavBar } from '../components/BottomNavBar';
import { CoverImage } from '../components/CoverImage';
import { IssueCard } from '../components/IssueCard';
import { IssueDetailModal } from '../components/IssueDetailModal';
import { LocalCatalogEditorModal } from '../components/LocalCatalogEditorModal';
import { SegmentedControl } from '../components/SegmentedControl';
import { ToolsModal } from '../components/ToolsModal';
import { UpdatePromptModal } from '../components/UpdatePromptModal';
import { createCatalogFromDefinition } from '../data/catalogHelpers';
import { defaultCatalog } from '../data/catalogs';
import { loadCatalogStore } from '../data/catalogStore';
import {
  defaultRecord,
  exportRecords,
  loadRecords,
  mergeRecord,
  normalizeStatus,
  parseImportedRecords,
  saveRecords,
} from '../storage/collectionStorage';
import {
  exportCatalogDefinition,
  parseImportedCatalogDefinition,
  upsertLocalCatalogDefinition,
} from '../storage/localCatalogStorage';
import { radii } from '../styles/constants';
import { useTheme } from '../styles/themeContext';
import type { ThemeTokens } from '../styles/themes/types';
import type {
  ComicCatalog,
  ComicIssue,
  ComicIssueKey,
  IssueFilter,
  IssueRecordMap,
  OwnershipStatus,
  StoredComicCatalogDefinition,
} from '../types';
import { checkForAppUpdate, type AppUpdateInfo } from '../update/versionCheck';

const filterOptions: Array<{ label: string; value: IssueFilter }> = [
  { label: '全部', value: 'all' },
  { label: '已有', value: 'owned' },
  { label: '缺本', value: 'missing' },
  { label: '想要', value: 'wishlist' },
];

const readerGirl = require('../../assets/ui/ai-chibi-reader.png');

function distance(touches: NativeTouchEvent['touches']) {
  if (touches.length < 2) {
    return 0;
  }
  const [first, second] = touches;
  return Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);
}

export function LibraryScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const colors = {
    muted: theme.textSecondary,
    shelfDark: theme.textPrimary,
    white: theme.textOnBrand,
  };

  const { width } = useWindowDimensions();
  const [records, setRecords] = useState<IssueRecordMap>({});
  const [catalogs, setCatalogs] = useState<ComicCatalog[]>([defaultCatalog]);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [catalogLoadFailed, setCatalogLoadFailed] = useState(false);
  const [columns, setColumns] = useState(3);
  const [filter, setFilter] = useState<IssueFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<ComicIssue | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIssueKeys, setSelectedIssueKeys] = useState<Set<ComicIssueKey>>(() => new Set());
  const [backupText, setBackupText] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [catalogEditorOpen, setCatalogEditorOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const selectedCatalogIdRef = useRef<string | null>(selectedCatalogId);
  const sessionLocalCatalogsRef = useRef(new Map<string, ComicCatalog>());
  const pinchStartDistance = useRef(0);
  const pinchStartColumns = useRef(4);

  useEffect(() => {
    loadRecords().then(setRecords);
  }, []);

  function resetCatalogSelectionState() {
    setSelectedIssue(null);
    setSelectedIssueKeys(new Set());
    setBatchMode(false);
  }

  function mergeWithSessionLocalCatalogs(loadedCatalogs: ComicCatalog[]) {
    const sessionLocalCatalogs = [...sessionLocalCatalogsRef.current.values()];
    if (sessionLocalCatalogs.length === 0) {
      return loadedCatalogs;
    }

    return [
      ...sessionLocalCatalogs,
      ...loadedCatalogs.filter((catalog) => !sessionLocalCatalogsRef.current.has(catalog.id)),
    ];
  }

  useEffect(() => {
    let cancelled = false;

    loadCatalogStore()
      .then((result) => {
        if (cancelled) {
          return;
        }
        const nextCatalogs = mergeWithSessionLocalCatalogs(result.catalogs);
        setCatalogs(nextCatalogs);
        const currentId = selectedCatalogIdRef.current;
        const nextSelectedId = currentId && nextCatalogs.some((catalog) => catalog.id === currentId)
          ? currentId
          : null;
        if (nextSelectedId !== currentId) {
          resetCatalogSelectionState();
          selectedCatalogIdRef.current = nextSelectedId;
          setSelectedCatalogId(nextSelectedId);
        }
        setCatalogLoadFailed(result.publicCatalogLoadFailed);
      })
      .catch(() => {
        if (!cancelled) {
          const nextCatalogs = mergeWithSessionLocalCatalogs([defaultCatalog]);
          setCatalogs(nextCatalogs);
          const currentId = selectedCatalogIdRef.current;
          const nextSelectedId = currentId && nextCatalogs.some((catalog) => catalog.id === currentId)
            ? currentId
            : null;
          if (nextSelectedId !== currentId) {
            resetCatalogSelectionState();
            selectedCatalogIdRef.current = nextSelectedId;
            setSelectedCatalogId(nextSelectedId);
          }
          setCatalogLoadFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    checkForAppUpdate()
      .then((info) => {
        if (!cancelled && info) {
          setUpdateInfo(info);
        }
      })
      .catch(() => {
        // Version checks are best-effort; collection tracking must keep working offline.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const currentCatalog = useMemo(
    () => catalogs.find((catalog) => catalog.id === selectedCatalogId) ?? catalogs[0] ?? defaultCatalog,
    [catalogs, selectedCatalogId],
  );
  const catalogOpen = selectedCatalogId !== null;

  const currentIssues = currentCatalog.issues;
  const totalIssues = currentCatalog.issueCount;

  const stats = useMemo(() => {
    const owned = currentIssues.filter((issue) => records[issue.key]?.status === 'owned').length;
    const wishlist = currentIssues.filter((issue) => records[issue.key]?.status === 'wishlist').length;
    return {
      owned,
      wishlist,
      missing: totalIssues - owned,
      percent: totalIssues > 0 ? Math.round((owned / totalIssues) * 100) : 0,
    };
  }, [currentIssues, records, totalIssues]);

  const filteredIssues = useMemo(() => {
    const normalizedQuery = query.trim();
    return currentIssues.filter((issue) => {
      const record = records[issue.key] ?? defaultRecord;
      const matchesFilter = filter === 'all' || record.status === filter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        issue.number.toString().includes(normalizedQuery) ||
        issue.label.includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [currentIssues, filter, query, records]);

  const filteredCatalogs = useMemo(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length === 0 || catalogOpen) {
      return catalogs;
    }

    return catalogs.filter((catalog) => {
      return (
        catalog.name.includes(normalizedQuery) ||
        catalog.shortName.includes(normalizedQuery) ||
        catalog.description?.includes(normalizedQuery)
      );
    });
  }, [catalogOpen, catalogs, query]);

  const maxContentWidth = 1040;
  const contentWidth = Math.min(width, maxContentWidth);
  const gap = width < 420 ? 8 : 12;
  const sidePadding = width < 420 ? 12 : 20;
  const cardWidth = Math.floor((contentWidth - sidePadding * 2 - gap * (columns - 1)) / columns);
  const selectedRecord = selectedIssue ? records[selectedIssue.key] ?? defaultRecord : defaultRecord;
  const progressOwnedWidth = `${Math.min(100, stats.percent)}%` as DimensionValue;
  const progressWantedWidth = `${Math.min(100, (stats.wishlist / Math.max(1, totalIssues)) * 100)}%` as DimensionValue;
  const visibleMissing = filteredIssues.filter((issue) => (records[issue.key] ?? defaultRecord).status === 'missing').length;

  function persist(nextRecords: IssueRecordMap) {
    setRecords(nextRecords);
    saveRecords(nextRecords).catch(() => {
      Alert.alert('保存失败', '本次修改没有写入本地存储，请稍后再试。');
    });
  }

  function addCatalogToState(definition: StoredComicCatalogDefinition) {
    const catalog = createCatalogFromDefinition(definition);
    sessionLocalCatalogsRef.current.delete(catalog.id);
    sessionLocalCatalogsRef.current.set(catalog.id, catalog);
    setCatalogs((current) => [catalog, ...current.filter((candidate) => candidate.id !== catalog.id)]);
    selectedCatalogIdRef.current = catalog.id;
    setSelectedCatalogId(catalog.id);
    resetCatalogSelectionState();
  }

  function openCatalog(catalogId: string) {
    selectedCatalogIdRef.current = catalogId;
    setSelectedCatalogId(catalogId);
    resetCatalogSelectionState();
    setQuery('');
    setFilter('all');
  }

  function closeCatalog() {
    selectedCatalogIdRef.current = null;
    setSelectedCatalogId(null);
    resetCatalogSelectionState();
    setQuery('');
    setFilter('all');
  }

  function getCatalogStats(catalog: ComicCatalog) {
    const owned = catalog.issues.filter((issue) => records[issue.key]?.status === 'owned').length;
    const wishlist = catalog.issues.filter((issue) => records[issue.key]?.status === 'wishlist').length;
    const missing = catalog.issueCount - owned;
    const percent = catalog.issueCount > 0 ? Math.round((owned / catalog.issueCount) * 100) : 0;
    return { owned, wishlist, missing, percent };
  }

  function updateIssue(issue: ComicIssue, patch: Parameters<typeof mergeRecord>[2]) {
    const next = mergeRecord(records, issue.number, patch, issue.catalogId);
    persist(next);
  }

  function toggleBatchSelection(issueKey: ComicIssueKey) {
    setSelectedIssueKeys((current) => {
      const next = new Set(current);
      if (next.has(issueKey)) {
        next.delete(issueKey);
      } else {
        next.add(issueKey);
      }
      return next;
    });
  }

  function enterBatchWith(issueKey?: ComicIssueKey) {
    setBatchMode(true);
    if (issueKey) {
      setSelectedIssueKeys((current) => new Set(current).add(issueKey));
    }
  }

  function exitBatchMode() {
    setBatchMode(false);
    setSelectedIssueKeys(new Set());
  }

  function selectVisibleIssues() {
    setSelectedIssueKeys(new Set(filteredIssues.map((issue) => issue.key)));
  }

  function applyBatchStatus(status: OwnershipStatus) {
    if (selectedIssueKeys.size === 0) {
      return;
    }

    let nextRecords = records;
    selectedIssueKeys.forEach((issueKey) => {
      const issue = currentIssues.find((candidate) => candidate.key === issueKey);
      if (!issue) {
        return;
      }
      const current = nextRecords[issue.key] ?? defaultRecord;
      nextRecords = mergeRecord(nextRecords, issue.number, {
        status,
        condition: normalizeStatus(status, current.condition),
      }, issue.catalogId);
    });
    persist(nextRecords);
    exitBatchMode();
  }

  function handleTouchStart(event: NativeSyntheticEvent<NativeTouchEvent>) {
    const touches = event.nativeEvent.touches;
    if (touches.length >= 2) {
      pinchStartDistance.current = distance(touches);
      pinchStartColumns.current = columns;
    }
  }

  function handleTouchMove(event: NativeSyntheticEvent<NativeTouchEvent>) {
    const touches = event.nativeEvent.touches;
    if (touches.length < 2 || pinchStartDistance.current === 0) {
      return;
    }

    const scale = distance(touches) / pinchStartDistance.current;
    const nextColumns = Math.max(3, Math.min(8, Math.round(pinchStartColumns.current / scale)));
    if (nextColumns !== columns) {
      setColumns(nextColumns);
    }
  }

  function handleExport() {
    setBackupText(exportRecords(records));
  }

  function handleImport() {
    try {
      const imported = parseImportedRecords(backupText);
      persist(imported);
      Alert.alert('导入完成', '收藏状态已经更新到本机。');
    } catch (error) {
      Alert.alert('导入失败', error instanceof Error ? error.message : '无法解析 JSON。');
    }
  }

  async function handleCreateCatalog(definition: StoredComicCatalogDefinition) {
    try {
      const localDefinitions = await upsertLocalCatalogDefinition(definition);
      addCatalogToState(localDefinitions.find((catalog) => catalog.id === definition.id) ?? definition);
      setCatalogEditorOpen(false);
      setToolsOpen(false);
    } catch {
      Alert.alert('保存失败', '目录没有写入本地存储，请稍后再试。');
    }
  }

  function handleExportCurrentCatalog() {
    if (currentCatalog.source.type !== 'local') {
      Alert.alert('暂不支持导出', '第一版只导出本机创建或导入的目录。');
      return;
    }

    setBackupText(exportCatalogDefinition(currentCatalog.source.definition));
  }

  async function handleImportCatalog() {
    try {
      const definition = parseImportedCatalogDefinition(backupText);
      const localDefinitions = await upsertLocalCatalogDefinition(definition);
      addCatalogToState(localDefinitions.find((catalog) => catalog.id === definition.id) ?? definition);
      Alert.alert('导入完成', '目录已经保存到本机。');
    } catch (error) {
      Alert.alert('导入失败', error instanceof Error ? error.message : '无法导入目录 JSON。');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.shell}>
        <View style={styles.header}>
          {catalogOpen && (
            <Pressable accessibilityRole="button" onPress={closeCatalog} style={styles.headerBackButton}>
              <MaterialCommunityIcons name="chevron-left" size={20} color={theme.textPrimary} />
              <Text style={styles.headerBackText}>返回</Text>
            </Pressable>
          )}
          <View style={styles.titleBlock}>
            <Text style={styles.appName}>MangaKeep</Text>
            <Text style={styles.catalogName} numberOfLines={1}>
              {catalogOpen ? `目录「${currentCatalog.name}」` : '我的漫画书架'}
            </Text>
          </View>
          {catalogOpen ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="打开当前目录工具"
              style={styles.headerIconButton}
              onPress={() => setToolsOpen(true)}
            >
              <MaterialCommunityIcons name="dots-horizontal" size={24} color={theme.textPrimary} />
            </Pressable>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="新建收藏目录"
                onPress={() => setCatalogEditorOpen(true)}
                style={styles.newCollectionButton}
              >
                <MaterialCommunityIcons name="folder-plus-outline" size={30} color={colors.shelfDark} />
                <Text style={styles.newCollectionText}>新建收藏</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="打开工具设置"
                style={styles.headerIconButton}
                onPress={() => setToolsOpen(true)}
              >
                <MaterialCommunityIcons name="cog-outline" size={22} color={theme.textPrimary} />
              </Pressable>
            </>
          )}
        </View>

        {catalogOpen ? (
          <>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.shelfTabsScroller}
          contentContainerStyle={styles.shelfTabs}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter === 'all' }}
            onPress={() => setFilter('all')}
            style={[styles.shelfTab, filter === 'all' && styles.shelfTabActive]}
          >
            <Text style={[styles.shelfTabText, filter === 'all' && styles.shelfTabTextActive]}>我的主架</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter === 'wishlist' }}
            onPress={() => setFilter('wishlist')}
            style={[styles.shelfTab, filter === 'wishlist' && styles.shelfTabActive]}
          >
            <Text style={[styles.shelfTabText, filter === 'wishlist' && styles.shelfTabTextActive]}>心愿单</Text>
          </Pressable>
          <Pressable style={styles.shelfTab} onPress={() => Alert.alert('电子版', '电子订阅分组会在后续版本开放。')}>
            <Text style={styles.shelfTabText}>电子订阅</Text>
          </Pressable>
          <Pressable style={styles.shelfTab} onPress={() => Alert.alert('借出', '借出记录分组会在后续版本开放。')}>
            <Text style={styles.shelfTabText}>借出</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="添加目录"
            onPress={() => setCatalogEditorOpen(true)}
            style={styles.addShelfButton}
          >
            <MaterialCommunityIcons name="plus" size={22} color={theme.textPrimary} />
          </Pressable>
        </ScrollView>

        <View style={styles.progressPanel}>
          <Text style={styles.progressPanelTitle}>收藏进度总览</Text>
          <View style={styles.progressStatsRow}>
            <View style={styles.progressStatGroupLeft}>
              <Text style={styles.statLabel}>已有：{stats.owned}</Text>
              <Text style={styles.statLabel}>缺本：{stats.missing}</Text>
            </View>
            <Text style={styles.progressPercent}>{stats.percent}%</Text>
            <View style={styles.progressStatGroupRight}>
              <Text style={styles.statLabel}>想要：</Text>
              <Text style={styles.statNumber}>{stats.wishlist}</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFillOwned, { width: progressOwnedWidth }]} />
            <View style={[styles.progressFillWanted, { width: progressWantedWidth }]} />
            <View style={[styles.progressFillMissing, { flex: 1 }]} />
          </View>
          <View style={styles.progressFooter}>
            <View style={styles.progressFooterIcon} />
            <Text style={styles.progressFooterText}>状态：已收集 {stats.percent}%</Text>
          </View>
        </View>

        <View style={styles.controls}>
          {catalogLoadFailed && (
            <Text style={styles.catalogWarning}>公共目录暂时不可用，已显示本地目录和内置目录。</Text>
          )}
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={19} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              keyboardType="number-pad"
              placeholder="搜索书库..."
              placeholderTextColor="#9a7c65"
              style={styles.search}
            />
          </View>
          <SegmentedControl options={filterOptions} value={filter} onChange={setFilter} />
          <View style={styles.catalogRow}>
            <Text style={styles.catalogLine}>
              当前显示 {filteredIssues.length} 本 · 缺本 {visibleMissing} 本
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={batchMode ? '完成批量操作' : '进入批量操作'}
              onPress={() => (batchMode ? exitBatchMode() : enterBatchWith())}
              style={[styles.batchToggle, batchMode && styles.batchToggleActive]}
            >
              <MaterialCommunityIcons
                name={batchMode ? 'check' : 'playlist-check'}
                size={15}
                color={batchMode ? colors.white : colors.shelfDark}
              />
              <Text style={[styles.batchToggleText, batchMode && styles.batchToggleTextActive]}>
                {batchMode ? '完成' : '批量操作'}
              </Text>
            </Pressable>
          </View>
          {batchMode && (
            <View style={styles.batchBar}>
              <Text style={styles.batchCount}>已选 {selectedIssueKeys.size} 本 · 点封面可多选，或按编号范围处理</Text>
              <View style={styles.batchActions}>
                <Pressable style={styles.batchButton} onPress={selectVisibleIssues}>
                  <MaterialCommunityIcons name="select-all" size={14} color={colors.shelfDark} />
                  <Text style={styles.batchButtonText}>全选当前</Text>
                </Pressable>
                <Pressable style={styles.batchButton} onPress={() => setSelectedIssueKeys(new Set())}>
                  <MaterialCommunityIcons name="selection-remove" size={14} color={colors.shelfDark} />
                  <Text style={styles.batchButtonText}>清空</Text>
                </Pressable>
                <Pressable style={[styles.batchButton, styles.batchPrimary]} onPress={() => applyBatchStatus('owned')}>
                  <MaterialCommunityIcons name="archive-check" size={14} color={colors.white} />
                  <Text style={[styles.batchButtonText, styles.batchPrimaryText]}>入库</Text>
                </Pressable>
                <Pressable style={styles.batchButton} onPress={() => applyBatchStatus('missing')}>
                  <MaterialCommunityIcons name="book-remove-outline" size={14} color={colors.shelfDark} />
                  <Text style={styles.batchButtonText}>标缺</Text>
                </Pressable>
                <Pressable style={styles.batchButton} onPress={() => applyBatchStatus('wishlist')}>
                  <MaterialCommunityIcons name="heart-plus" size={14} color={colors.shelfDark} />
                  <Text style={styles.batchButtonText}>想要</Text>
                </Pressable>
                <Pressable style={styles.batchButton} onPress={() => navigation.navigate('BatchAction')}>
                  <MaterialCommunityIcons name="ray-start-arrow" size={14} color={colors.shelfDark} />
                  <Text style={styles.batchButtonText}>范围标记</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        <View style={styles.gridWrap} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
          <FlatList
            key={`columns-${columns}`}
            data={filteredIssues}
            numColumns={columns}
            keyExtractor={(item) => item.key}
            contentContainerStyle={[styles.gridContent, { paddingHorizontal: sidePadding }]}
            columnWrapperStyle={columns > 1 ? { gap } : undefined}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Image source={readerGirl} resizeMode="contain" style={styles.emptyImage} />
                <Text style={styles.emptyTitle}>没有匹配的漫画</Text>
                <Text style={styles.emptyText}>换一个编号或筛选条件，再查一次。</Text>
              </View>
            }
            renderItem={({ item }) => (
              <IssueCard
                issue={item}
                record={records[item.key] ?? defaultRecord}
                selected={selectedIssueKeys.has(item.key)}
                width={cardWidth}
                onPress={() => (batchMode ? toggleBatchSelection(item.key) : setSelectedIssue(item))}
                onLongPress={() => enterBatchWith(item.key)}
              />
            )}
          />
        </View>

          </>
        ) : (
          <View style={styles.catalogHome}>
            {catalogLoadFailed && (
              <Text style={styles.catalogWarning}>公共目录暂时不可用，已显示本地目录和内置目录。</Text>
            )}
            <View style={styles.searchBox}>
              <MaterialCommunityIcons name="magnify" size={19} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="搜索漫画书或目录..."
                placeholderTextColor="#9a7c65"
                style={styles.search}
              />
            </View>
            <View style={styles.catalogHomeHeader}>
              <Text style={styles.catalogHomeTitle}>漫画书列表</Text>
              <Text style={styles.catalogHomeMeta}>{filteredCatalogs.length} 个目录</Text>
            </View>
            <ScrollView style={styles.catalogList} contentContainerStyle={styles.catalogListContent}>
              {filteredCatalogs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Image source={readerGirl} resizeMode="contain" style={styles.emptyImage} />
                  <Text style={styles.emptyTitle}>没有匹配的漫画书</Text>
                  <Text style={styles.emptyText}>换一个关键词，或新建一个本地目录。</Text>
                </View>
              ) : (
                filteredCatalogs.map((catalog) => {
                  const catalogStats = getCatalogStats(catalog);
                  const previewIssues = catalog.issues.slice(0, 3);
                  return (
                    <Pressable
                      key={catalog.id}
                      accessibilityRole="button"
                      accessibilityLabel={`打开${catalog.name}`}
                      onPress={() => openCatalog(catalog.id)}
                      style={styles.catalogBookCard}
                    >
                      <View style={styles.catalogCoverStack}>
                        {previewIssues.map((issue, index) => (
                          <View key={issue.key} style={[styles.catalogPreviewCover, { left: index * 26 }]}>
                            <CoverImage
                              source={issue.cover as any}
                              uri={issue.coverUrl}
                              issueNumber={issue.number.toString()}
                              style={styles.catalogPreviewImage}
                            />
                          </View>
                        ))}
                      </View>
                      <View style={styles.catalogBookInfo}>
                        <Text style={styles.catalogBookName} numberOfLines={1}>{catalog.name}</Text>
                        <Text style={styles.catalogBookDesc} numberOfLines={2}>
                          {catalog.description ?? `${catalog.kind} · 共 ${catalog.issueCount} 本`}
                        </Text>
                        <View style={styles.catalogStatsRow}>
                          <Text style={styles.catalogStatText}>已有 {catalogStats.owned}</Text>
                          <Text style={styles.catalogStatText}>缺本 {catalogStats.missing}</Text>
                          <Text style={styles.catalogStatText}>想要 {catalogStats.wishlist}</Text>
                        </View>
                      </View>
                      <View style={styles.catalogPercentPill}>
                        <Text style={styles.catalogPercentText}>{catalogStats.percent}%</Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}

        <BottomNavBar />
      </View>

      <ToolsModal
        visible={toolsOpen}
        onClose={() => setToolsOpen(false)}
      />
      <LocalCatalogEditorModal
        visible={catalogEditorOpen}
        onClose={() => setCatalogEditorOpen(false)}
        onSave={handleCreateCatalog}
      />

      <IssueDetailModal
        issue={selectedIssue}
        record={selectedRecord}
        catalogName={currentCatalog.name}
        visible={Boolean(selectedIssue)}
        onClose={() => setSelectedIssue(null)}
        onSave={(patch) => {
          if (!selectedIssue) {
            return;
          }
          updateIssue(selectedIssue, {
            ...patch,
            condition: normalizeStatus(patch.status, patch.condition),
          });
          setSelectedIssue(null);
        }}
      />
      <UpdatePromptModal
        visible={Boolean(updateInfo)}
        updateInfo={updateInfo}
        onDismiss={() => setUpdateInfo(null)}
      />
    </SafeAreaView>
  );
}

const getStyles = (theme: ThemeTokens) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surfaceSoft,
  },
  titleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  headerBackButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.brand,
    paddingLeft: 6,
    paddingRight: 10,
    marginRight: 10,
    backgroundColor: theme.surface,
  },
  headerBackText: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  appName: {
    color: theme.textPrimary,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
  },
  catalogName: {
    color: theme.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  newCollectionButton: {
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: theme.brand,
    backgroundColor: theme.surface,
    marginLeft: 8,
  },
  newCollectionText: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  shelfTabsScroller: {
    backgroundColor: theme.background,
    flexGrow: 0,
    flexShrink: 0,
    height: 56,
  },
  shelfTabs: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  shelfTab: {
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: radii.md,
    paddingHorizontal: 8,
  },
  shelfTabActive: {
    backgroundColor: theme.brand,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  shelfTabText: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  shelfTabTextActive: {
    color: theme.textOnAccent,
  },
  addShelfButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.brand,
  },
  progressPanel: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
    borderRadius: radii.xl,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  progressPanelTitle: {
    color: theme.textPrimary,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 12,
  },
  progressStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressStatGroupLeft: {
    alignItems: 'flex-start',
    gap: 8,
  },
  progressStatGroupRight: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  statNumber: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  progressPercent: {
    color: theme.textPrimary,
    fontSize: 54,
    fontWeight: '900',
    lineHeight: 58,
  },
  progressTrack: {
    height: 16,
    borderRadius: radii.md,
    backgroundColor: theme.surfaceSoft,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.textPrimary,
    flexDirection: 'row',
  },
  progressFillOwned: {
    height: '100%',
    backgroundColor: theme.owned,
    borderRightWidth: 1,
    borderRightColor: theme.textPrimary,
  },
  progressFillWanted: {
    height: '100%',
    backgroundColor: theme.wanted,
    borderRightWidth: 1,
    borderRightColor: theme.textPrimary,
  },
  progressFillMissing: {
    height: '100%',
    backgroundColor: theme.missing,
  },
  progressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 6,
  },
  progressFooterIcon: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: theme.owned,
  },
  progressFooterText: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  controls: {
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBox: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.textPrimary,
    paddingHorizontal: 14,
    backgroundColor: theme.surfaceRaised,
  },
  search: {
    flex: 1,
    height: '100%',
    color: theme.textPrimary,
    fontSize: 15,
  },
  catalogLine: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  catalogWarning: {
    marginBottom: 10,
    color: theme.danger,
    fontSize: 12,
    fontWeight: '800',
  },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  batchToggle: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.brand,
    paddingHorizontal: 12,
    backgroundColor: theme.surface,
  },
  batchToggleActive: {
    borderColor: theme.brand,
    backgroundColor: theme.brand,
  },
  batchToggleText: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  batchToggleTextActive: {
    color: theme.textOnBrand,
  },
  batchBar: {
    gap: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    padding: 10,
    backgroundColor: theme.surfaceRaised,
  },
  batchCount: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  batchActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  batchButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: theme.brand,
    paddingHorizontal: 10,
    backgroundColor: theme.surface,
  },
  batchPrimary: {
    borderColor: theme.brand,
    backgroundColor: theme.brand,
  },
  batchButtonText: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: '900',
  },
  batchPrimaryText: {
    color: theme.textOnBrand,
  },
  gridWrap: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surfaceSoft,
  },
  gridContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  catalogHome: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  catalogHomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catalogHomeTitle: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  catalogHomeMeta: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  catalogList: {
    flex: 1,
  },
  catalogListContent: {
    gap: 12,
    paddingBottom: 18,
  },
  catalogBookCard: {
    minHeight: 132,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    backgroundColor: theme.surface,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  catalogCoverStack: {
    width: 112,
    height: 108,
    marginRight: 14,
  },
  catalogPreviewCover: {
    position: 'absolute',
    top: 0,
    width: 70,
    height: 94,
    borderRadius: radii.md,
    backgroundColor: theme.surfaceRaised,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  catalogPreviewImage: {
    width: 70,
    height: 94,
    borderRadius: radii.md,
  },
  catalogBookInfo: {
    flex: 1,
    minWidth: 0,
  },
  catalogBookName: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  catalogBookDesc: {
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  catalogStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catalogStatText: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  catalogPercentPill: {
    minWidth: 46,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: theme.brandSoft,
  },
  catalogPercentText: {
    color: theme.brand,
    fontSize: 13,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 44,
  },
  emptyImage: {
    width: 132,
    height: 132,
    marginBottom: 10,
  },
  emptyTitle: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 6,
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
});
