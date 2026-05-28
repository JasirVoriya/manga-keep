import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { radii } from '../styles/constants';
import { useTheme } from '../styles/themeContext';
import type { ThemeTokens } from '../styles/themes/types';
import type { ComicIssue, IssueCondition, IssueRecord, OwnershipStatus } from '../types';
import { CoverImage } from './CoverImage';
import { SegmentedControl } from './SegmentedControl';

type Props = {
  issue: ComicIssue | null;
  record: IssueRecord;
  catalogName: string;
  visible: boolean;
  onClose: () => void;
  onSave: (patch: { status: OwnershipStatus; condition: IssueCondition; note: string }) => void;
};

const statusOptions: Array<{ label: string; value: OwnershipStatus }> = [
  { label: '已有', value: 'owned' },
  { label: '缺本', value: 'missing' },
  { label: '想要', value: 'wishlist' },
];

const conditionOptions: Array<{ label: string; value: IssueCondition }> = [
  { label: '全新', value: 'mint' },
  { label: '良好', value: 'good' },
  { label: '瑕疵', value: 'worn' },
];

export function IssueDetailModal({ issue, record, catalogName, visible, onClose, onSave }: Props) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  
  const [status, setStatus] = useState<OwnershipStatus>(record.status);
  const [condition, setCondition] = useState<IssueCondition>(record.condition);
  const [note, setNote] = useState(record.note);

  useEffect(() => {
    setStatus(record.status);
    setCondition(record.condition === 'good' || record.condition === 'worn' ? record.condition : 'mint');
    setNote(record.note);
  }, [record, visible]);

  const isModified = useMemo(() => {
    return status !== record.status || condition !== record.condition || note !== record.note;
  }, [status, condition, note, record]);

  if (!issue) {
    return null;
  }

  const isMissing = status === 'missing';
  const statusLabel = status === 'owned' ? '已收藏' : status === 'missing' ? '缺本中' : '想要';

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color={theme.textPrimary} />
            </Pressable>
            <Text style={styles.kicker}>第 {issue.number} 期</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{statusLabel}</Text>
            </View>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <View style={styles.detailIntro}>
              <View style={styles.posterWrap}>
                <CoverImage 
                  source={issue.cover as any}
                  uri={issue.coverUrl}
                  issueNumber={issue.number.toString()}
                  style={[styles.posterCover, isMissing ? { opacity: 0.55 } : {}]}
                />
              </View>

              <View style={styles.infoCard}>
                <MaterialCommunityIcons name="star-four-points-outline" size={18} color={theme.accent} style={styles.sparkleTop} />
                <Text style={styles.infoLabel}>漫画标题：</Text>
                <Text style={styles.infoValue} numberOfLines={2}>{issue.displayTitle}</Text>
                <Text style={styles.infoLabel}>目录：</Text>
                <Text style={styles.infoValueSmall} numberOfLines={1}>{catalogName}</Text>
                <Text style={styles.infoLabel}>出版类型：</Text>
                <Text style={styles.infoValueSmall}>{issue.label}</Text>
              </View>
            </View>

            <View style={styles.formHeaderRow}>
              <Text style={styles.label}>状态</Text>
              <MaterialCommunityIcons name="star-four-points-outline" size={18} color={theme.textSecondary} />
            </View>
            <SegmentedControl options={statusOptions} value={status} onChange={setStatus} />

            <View style={styles.formHeaderRow}>
              <Text style={styles.label}>品相</Text>
              <MaterialCommunityIcons name="star-four-points-outline" size={18} color={theme.textSecondary} />
            </View>
            <View style={status === 'owned' ? styles.activeGroup : styles.inactiveGroup}>
              <SegmentedControl options={conditionOptions} value={condition} onChange={setCondition} />
            </View>

            <Text style={styles.label}>备注</Text>
            <TextInput
              multiline
              value={note}
              onChangeText={setNote}
              placeholder="在这里写下你的收藏备注..."
              placeholderTextColor={theme.textMuted}
              style={styles.note}
            />
          </ScrollView>

          {/* 底部保存栏 */}
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={() => isModified && onSave({ status, condition, note })}
              style={[styles.saveButton, !isModified && styles.saveButtonDisabled]}
              disabled={!isModified}
            >
              <Text style={[styles.saveText, !isModified && styles.saveTextDisabled]}>保存</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (theme: ThemeTokens) => StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(67, 38, 22, 0.28)',
    paddingHorizontal: 16,
  },
  sheet: {
    height: '92%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    overflow: 'hidden',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surfaceSoft,
  },
  kicker: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: theme.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: theme.surfaceRaised,
    zIndex: 1,
  },
  statusPill: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
    backgroundColor: theme.surfaceRaised,
    zIndex: 1,
  },
  statusPillText: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  detailIntro: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  posterWrap: {
    width: 128,
    aspectRatio: 3 / 4,
    borderRadius: radii.xl,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    backgroundColor: theme.surfaceRaised,
  },
  posterCover: {
    width: '100%',
    height: '100%',
    borderRadius: radii.xl,
  },
  infoCard: {
    flex: 1,
    minHeight: 172,
    borderRadius: radii.xl,
    padding: 18,
    backgroundColor: theme.surfaceRaised,
  },
  sparkleTop: {
    position: 'absolute',
    right: 14,
    top: 12,
  },
  infoLabel: {
    color: theme.textPrimary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500',
    marginTop: 4,
  },
  infoValue: {
    color: theme.textPrimary,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
    marginBottom: 12,
  },
  infoValueSmall: {
    color: theme.textPrimary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    marginBottom: 12,
  },
  formHeaderRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  activeGroup: {
    opacity: 1,
  },
  inactiveGroup: {
    opacity: 1,
  },
  label: {
    marginTop: 12,
    marginBottom: 8,
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: '500',
  },
  note: {
    minHeight: 132,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    padding: 16,
    color: theme.textPrimary,
    backgroundColor: theme.surfaceRaised,
    textAlignVertical: 'top',
    fontSize: 16,
    lineHeight: 22,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    padding: 18,
    paddingBottom: 28,
    backgroundColor: theme.surface,
  },
  saveButton: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.xxl,
    backgroundColor: theme.info,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  saveText: {
    color: theme.textOnBrand,
    fontSize: 18,
    fontWeight: '900',
  },
  saveTextDisabled: {
    color: theme.textMuted,
  },
});
