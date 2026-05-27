import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { radii } from '../styles/constants';
import { useTheme } from '../styles/themeContext';
import type { ThemeTokens } from '../styles/themes/types';
import type { ComicIssue, IssueCondition, IssueRecord, OwnershipStatus } from '../types';
import { CoverImage } from './CoverImage';
import { SegmentedControl } from './SegmentedControl';
import { StatusBadge } from './StatusBadge';

type Props = {
  issue: ComicIssue | null;
  record: IssueRecord;
  catalogName: string;
  visible: boolean;
  onClose: () => void;
  onSave: (patch: { status: OwnershipStatus; condition: IssueCondition; note: string }) => void;
};

const statusOptions: Array<{ label: string; value: OwnershipStatus }> = [
  { label: '缺少', value: 'missing' },
  { label: '已有', value: 'owned' },
  { label: '想要', value: 'wishlist' },
];

const conditionOptions: Array<{ label: string; value: IssueCondition }> = [
  { label: '未标记', value: 'ungraded' },
  { label: '全新', value: 'mint' },
  { label: '良好', value: 'good' },
  { label: '瑕疵', value: 'worn' },
  { label: '重复', value: 'duplicate' },
];

export function IssueDetailModal({ issue, record, catalogName, visible, onClose, onSave }: Props) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  
  const [status, setStatus] = useState<OwnershipStatus>(record.status);
  const [condition, setCondition] = useState<IssueCondition>(record.condition);
  const [note, setNote] = useState(record.note);

  useEffect(() => {
    setStatus(record.status);
    setCondition(record.condition);
    setNote(record.note);
  }, [record, visible]);

  const isModified = useMemo(() => {
    return status !== record.status || condition !== record.condition || note !== record.note;
  }, [status, condition, note, record]);

  if (!issue) {
    return null;
  }

  const isMissing = status === 'missing';

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.kicker}>第 {issue.number} 期</Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color={theme.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* 图文基础信息区 */}
            <View style={styles.infoRow}>
              <View style={styles.coverWrap}>
                <CoverImage 
                  source={issue.cover as any}
                  uri={issue.coverUrl}
                  issueNumber={issue.number.toString()}
                  style={[styles.cover, isMissing ? { opacity: 0.5 } : {}]}
                />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.title} numberOfLines={2}>{issue.displayTitle}</Text>
                <Text style={styles.catalogName} numberOfLines={1}>{catalogName}</Text>
                <View style={styles.statusBadgeWrap}>
                  <StatusBadge status={status as any} />
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* 编辑区 */}
            <Text style={styles.label}>收藏状态</Text>
            <SegmentedControl options={statusOptions} value={status} onChange={setStatus} />

            <View style={status === 'owned' ? styles.activeGroup : styles.inactiveGroup}>
              <Text style={styles.label}>品相</Text>
              <SegmentedControl options={conditionOptions} value={condition} onChange={setCondition} />
            </View>

            <Text style={styles.label}>备注</Text>
            <TextInput
              multiline
              value={note}
              onChangeText={setNote}
              placeholder="记录品相、来源、缺件或求购提醒"
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
              <MaterialCommunityIcons name="content-save-check" size={18} color={isModified ? theme.textOnBrand : theme.textMuted} />
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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.44)',
  },
  sheet: {
    height: '90%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surface,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  kicker: {
    color: theme.brand,
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: theme.surfaceRaised,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  coverWrap: {
    width: 100,
    borderRadius: radii.sm,
    shadowColor: theme.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cover: {
    width: '100%',
    height: undefined,
    aspectRatio: 3 / 4,
  },
  infoTextWrap: {
    flex: 1,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
    lineHeight: 28,
  },
  catalogName: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  statusBadgeWrap: {
    alignSelf: 'flex-start',
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 20,
  },
  activeGroup: {
    opacity: 1,
  },
  inactiveGroup: {
    opacity: 0.4,
  },
  label: {
    marginTop: 14,
    marginBottom: 8,
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  note: {
    minHeight: 86,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    padding: 12,
    color: theme.textPrimary,
    backgroundColor: theme.surfaceRaised,
    textAlignVertical: 'top',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    padding: 18,
    paddingBottom: 28,
    backgroundColor: theme.surface,
  },
  saveButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.md,
    backgroundColor: theme.brand,
  },
  saveButtonDisabled: {
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  saveText: {
    color: theme.textOnBrand,
    fontSize: 16,
    fontWeight: '900',
  },
  saveTextDisabled: {
    color: theme.textMuted,
  },
});
