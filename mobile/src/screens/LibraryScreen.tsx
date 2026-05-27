import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  NativeSyntheticEvent,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type NativeTouchEvent,
} from 'react-native';
import { AnimatedMangaDecor } from '../components/AnimatedMangaDecor';
import { CatalogSwitcher } from '../components/CatalogSwitcher';
import { IssueCard } from '../components/IssueCard';
import { IssueDetailModal } from '../components/IssueDetailModal';
import { LocalCatalogEditorModal } from '../components/LocalCatalogEditorModal';
import { MascotSticker } from '../components/MascotSticker';
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
  { label: '缺少', value: 'missing' },
  { label: '想要', value: 'wishlist' },
];

const chibiAssistant = require('../../assets/ui/ai-chibi-collector.png');
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
  const colors = {
    muted: theme.textSecondary,
    shelfDark: theme.textPrimary,
    white: theme.textOnBrand
  };

  const { width } = useWindowDimensions();
  const [records, setRecords] = useState<IssueRecordMap>({});
  const [catalogs, setCatalogs] = useState<ComicCatalog[]>([defaultCatalog]);
  const [selectedCatalogId, setSelectedCatalogId] = useState(defaultCatalog.id);
  const [catalogLoadFailed, setCatalogLoadFailed] = useState(false);
  const [columns, setColumns] = useState(4);
  const [filter, setFilter] = useState<IssueFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<ComicIssue | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIssueKeys, setSelectedIssueKeys] = useState<Set<ComicIssueKey>>(() => new Set());
  const [backupText, setBackupText] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [catalogEditorOpen, setCatalogEditorOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const selectedCatalogIdRef = useRef(selectedCatalogId);
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
        const nextSelectedId = nextCatalogs.some((catalog) => catalog.id === currentId)
          ? currentId
          : nextCatalogs[0]?.id ?? defaultCatalog.id;
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
          const nextSelectedId = nextCatalogs.some((catalog) => catalog.id === currentId)
            ? currentId
            : nextCatalogs[0]?.id ?? defaultCatalog.id;
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

  const maxContentWidth = 1040;
  const contentWidth = Math.min(width, maxContentWidth);
  const gap = width < 420 ? 8 : 12;
  const sidePadding = width < 420 ? 12 : 20;
  const cardWidth = Math.floor((contentWidth - sidePadding * 2 - gap * (columns - 1)) / columns);
  const selectedRecord = selectedIssue ? records[selectedIssue.key] ?? defaultRecord : defaultRecord;

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
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>把那些年追过的漫刊，好好收藏起来</Text>
            <Text style={styles.appName}>{currentCatalog.name}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="打开备份工具"
            onPress={() => setToolsOpen(true)}
            style={styles.toolButton}
          >
            <MaterialCommunityIcons name="database-cog" size={17} color={colors.shelfDark} />
            <Text style={styles.toolButtonText}>工具</Text>
          </Pressable>
        </View>

        <View style={styles.progressPanel}>
          <AnimatedMangaDecor compact />
          <MascotSticker source={chibiAssistant} size={92} style={styles.progressMascot} />
          <View>
            <Text style={styles.progressNumber}>{stats.percent}%</Text>
            <Text style={styles.progressCaption}>收集完成</Text>
          </View>
          <View style={styles.statColumn}>
            <Text style={styles.statLine}>已有 {stats.owned} / {totalIssues}</Text>
            <Text style={styles.statLine}>缺本 {stats.missing} · 蹲守 {stats.wishlist}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${stats.percent}%` }]} />
          </View>
        </View>

        <View style={styles.controls}>
          <CatalogSwitcher
            catalogs={catalogs}
            selectedCatalogId={currentCatalog.id}
            onSelectCatalog={(catalogId) => {
              if (catalogId === currentCatalog.id) {
                return;
              }
              selectedCatalogIdRef.current = catalogId;
              setSelectedCatalogId(catalogId);
              resetCatalogSelectionState();
            }}
          />
          {catalogLoadFailed && (
            <Text style={styles.catalogWarning}>公共目录暂时不可用，已显示本地目录和内置目录。</Text>
          )}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <MaterialCommunityIcons name="magnify" size={19} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                keyboardType="number-pad"
                placeholder="搜索期号，例如 128"
                placeholderTextColor="#9a7c65"
                style={styles.search}
              />
            </View>
            <View style={styles.densityButtons}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="增加网格列数"
                style={styles.iconButton}
                onPress={() => setColumns((value) => Math.min(8, value + 1))}
              >
                <MaterialCommunityIcons name="view-grid-plus" size={19} color={colors.white} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="减少网格列数"
                style={styles.iconButton}
                onPress={() => setColumns((value) => Math.max(3, value - 1))}
              >
                <MaterialCommunityIcons name="minus-box-outline" size={19} color={colors.white} />
              </Pressable>
            </View>
          </View>
          <SegmentedControl options={filterOptions} value={filter} onChange={setFilter} />
          <View style={styles.catalogRow}>
            <Text style={styles.catalogLine}>
              当前显示 {filteredIssues.length} 期 · {columns} 列
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={batchMode ? '退出批量模式' : '进入批量模式'}
              onPress={() => (batchMode ? exitBatchMode() : enterBatchWith())}
              style={[styles.batchToggle, batchMode && styles.batchToggleActive]}
            >
              <MaterialCommunityIcons
                name={batchMode ? 'close-box-multiple' : 'checkbox-multiple-marked-outline'}
                size={15}
                color={batchMode ? colors.white : colors.shelfDark}
              />
              <Text style={[styles.batchToggleText, batchMode && styles.batchToggleTextActive]}>
                {batchMode ? '退出批量' : '批量'}
              </Text>
            </Pressable>
          </View>
          {batchMode && (
            <View style={styles.batchBar}>
              <Text style={styles.batchCount}>已选 {selectedIssueKeys.size} 期</Text>
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
      </View>

      <ToolsModal
        visible={toolsOpen}
        backupText={backupText}
        onChangeBackupText={setBackupText}
        onClose={() => setToolsOpen(false)}
        onCreateCatalog={() => setCatalogEditorOpen(true)}
        onExportRecords={handleExport}
        onImportRecords={handleImport}
        onExportCurrentCatalog={handleExportCurrentCatalog}
        onImportCatalog={handleImportCatalog}
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
    paddingTop: 20,
    paddingBottom: 14,
  },
  titleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    color: theme.brand,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  appName: {
    marginTop: 4,
    color: theme.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  toolButton: {
    height: 38,
    minWidth: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surfaceRaised,
  },
  toolButtonText: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  progressPanel: {
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    padding: 14,
    paddingRight: 104,
    backgroundColor: theme.surfaceSoft,
    shadowColor: theme.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  progressMascot: {
    position: 'absolute',
    right: 10,
    bottom: 14,
  },
  progressNumber: {
    color: theme.brand,
    fontSize: 44,
    fontWeight: '900',
  },
  progressCaption: {
    marginTop: -4,
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  statColumn: {
    marginTop: 5,
    alignItems: 'flex-start',
  },
  statLine: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    marginTop: 14,
    borderRadius: radii.md,
    backgroundColor: theme.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.md,
    backgroundColor: theme.brand,
  },
  controls: {
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    paddingHorizontal: 12,
    backgroundColor: theme.surfaceRaised,
  },
  search: {
    flex: 1,
    height: '100%',
    color: theme.textPrimary,
    fontSize: 15,
  },
  densityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: theme.brand,
  },
  iconText: {
    color: theme.textOnBrand,
    fontSize: 18,
    fontWeight: '900',
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
    minWidth: 76,
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surfaceRaised,
  },
  batchToggleActive: {
    borderColor: theme.danger,
    backgroundColor: theme.danger,
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
    borderColor: theme.borderStrong,
    paddingHorizontal: 10,
    backgroundColor: theme.surfaceSoft,
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
    backgroundColor: theme.background,
  },
  gridContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
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
