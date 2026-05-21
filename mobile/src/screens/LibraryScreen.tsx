import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
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
import { MascotSticker } from '../components/MascotSticker';
import { SegmentedControl } from '../components/SegmentedControl';
import { UpdatePromptModal } from '../components/UpdatePromptModal';
import { defaultCatalog } from '../data/catalogs';
import { loadConfiguredCatalogs } from '../data/catalogRegistry';
import {
  defaultRecord,
  exportRecords,
  loadRecords,
  mergeRecord,
  normalizeStatus,
  parseImportedRecords,
  saveRecords,
} from '../storage/collectionStorage';
import { colors, radii } from '../styles/theme';
import type { ComicCatalog, ComicIssue, ComicIssueKey, IssueFilter, IssueRecordMap, OwnershipStatus } from '../types';
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
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
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

  useEffect(() => {
    let cancelled = false;

    loadConfiguredCatalogs({ fallbackToBundled: false })
      .then((loadedCatalogs) => {
        if (cancelled) {
          return;
        }
        setCatalogs(loadedCatalogs);
        setSelectedCatalogId((currentId) => {
          const nextSelectedId = loadedCatalogs.some((catalog) => catalog.id === currentId)
            ? currentId
            : loadedCatalogs[0]?.id ?? defaultCatalog.id;
          if (nextSelectedId !== currentId) {
            resetCatalogSelectionState();
          }
          return nextSelectedId;
        });
        setCatalogLoadFailed(false);
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogs([defaultCatalog]);
          setSelectedCatalogId((currentId) => {
            if (currentId !== defaultCatalog.id) {
              resetCatalogSelectionState();
            }
            return defaultCatalog.id;
          });
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>漫画收藏记录</Text>
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
              setSelectedCatalogId(catalogId);
              resetCatalogSelectionState();
            }}
          />
          {catalogLoadFailed && (
            <Text style={styles.catalogWarning}>远程漫画目录暂时不可用，正在使用内置目录。</Text>
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

      <Modal animationType="fade" transparent visible={toolsOpen} onRequestClose={() => setToolsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.toolsSheet}>
            <View style={styles.toolsHeader}>
              <View>
                <Text style={styles.eyebrow}>本地数据</Text>
                <Text style={styles.toolsTitle}>备份工具</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="关闭备份工具"
                onPress={() => setToolsOpen(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.white} />
              </Pressable>
            </View>
            <View style={styles.backupActions}>
              <Pressable style={styles.secondaryButton} onPress={handleExport}>
                <MaterialCommunityIcons name="download-box-outline" size={16} color={colors.shelfDark} />
                <Text style={styles.secondaryText}>生成备份</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={handleImport}>
                <MaterialCommunityIcons name="upload-box-outline" size={16} color={colors.shelfDark} />
                <Text style={styles.secondaryText}>导入备份</Text>
              </Pressable>
            </View>
            <TextInput
              multiline
              value={backupText}
              onChangeText={setBackupText}
              placeholder="备份 JSON 会显示在这里，也可以粘贴旧备份再导入"
              placeholderTextColor="#8b8173"
              style={styles.backupInput}
            />
          </View>
        </View>
      </Modal>

      <IssueDetailModal
        issue={selectedIssue}
        record={selectedRecord}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.paper,
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
    color: colors.redDark,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  appName: {
    marginTop: 4,
    color: colors.ink,
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
    borderColor: colors.lineStrong,
    backgroundColor: colors.cream,
  },
  toolButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  progressPanel: {
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: 14,
    paddingRight: 104,
    backgroundColor: colors.peach,
    shadowColor: colors.shelfDark,
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
    color: colors.redDark,
    fontSize: 44,
    fontWeight: '900',
  },
  progressCaption: {
    marginTop: -4,
    color: colors.shelfDark,
    fontSize: 12,
    fontWeight: '800',
  },
  statColumn: {
    marginTop: 5,
    alignItems: 'flex-start',
  },
  statLine: {
    color: colors.shelfDark,
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    marginTop: 14,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 250, 240, 0.78)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.md,
    backgroundColor: colors.redDark,
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
    borderColor: colors.lineStrong,
    paddingHorizontal: 12,
    backgroundColor: colors.cream,
  },
  search: {
    flex: 1,
    height: '100%',
    color: colors.ink,
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
    backgroundColor: colors.shelf,
  },
  iconText: {
    color: colors.paperWarm,
    fontSize: 18,
    fontWeight: '900',
  },
  catalogLine: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  catalogWarning: {
    marginBottom: 10,
    color: colors.redDark,
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
    borderColor: colors.lineStrong,
    backgroundColor: colors.cream,
  },
  batchToggleActive: {
    borderColor: colors.red,
    backgroundColor: colors.redDark,
  },
  batchToggleText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  batchToggleTextActive: {
    color: colors.paperWarm,
  },
  batchBar: {
    gap: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: 10,
    backgroundColor: colors.cream,
  },
  batchCount: {
    color: colors.ink,
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
    borderColor: colors.lineStrong,
    paddingHorizontal: 10,
    backgroundColor: colors.paperWarm,
  },
  batchPrimary: {
    borderColor: colors.redDark,
    backgroundColor: colors.redDark,
  },
  batchButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  batchPrimaryText: {
    color: colors.paperWarm,
  },
  gridWrap: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: '#fff1e2',
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
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(59, 29, 18, 0.42)',
  },
  toolsSheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.lineStrong,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: colors.paperWarm,
  },
  toolsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  toolsTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.shelf,
  },
  backupActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  secondaryButton: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.cream,
  },
  secondaryText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  backupInput: {
    minHeight: 120,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: 10,
    color: colors.ink,
    backgroundColor: colors.cream,
    fontSize: 12,
    textAlignVertical: 'top',
  },
});
