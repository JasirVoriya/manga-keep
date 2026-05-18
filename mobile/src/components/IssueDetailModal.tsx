import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii } from '../styles/theme';
import type { ComicIssue, IssueCondition, IssueRecord, OwnershipStatus } from '../types';
import { SegmentedControl } from './SegmentedControl';

type Props = {
  issue: ComicIssue | null;
  record: IssueRecord;
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

export function IssueDetailModal({ issue, record, visible, onClose, onSave }: Props) {
  const [status, setStatus] = useState<OwnershipStatus>(record.status);
  const [condition, setCondition] = useState<IssueCondition>(record.condition);
  const [note, setNote] = useState(record.note);

  useEffect(() => {
    setStatus(record.status);
    setCondition(record.condition);
    setNote(record.note);
  }, [record, visible]);

  if (!issue) {
    return null;
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>期刊详情</Text>
              <Text style={styles.title}>{issue.displayTitle}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color={colors.white} />
            </Pressable>
          </View>

          <Text style={styles.label}>收藏状态</Text>
          <SegmentedControl options={statusOptions} value={status} onChange={setStatus} />

          <Text style={styles.label}>品相</Text>
          <SegmentedControl options={conditionOptions} value={condition} onChange={setCondition} />

          <Text style={styles.label}>备注</Text>
          <TextInput
            multiline
            value={note}
            onChangeText={setNote}
            placeholder="例如：带赠品、封面有折痕、已在某店下单"
            placeholderTextColor="#8b9893"
            style={styles.note}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => onSave({ status, condition, note })}
            style={styles.saveButton}
          >
            <MaterialCommunityIcons name="content-save-check" size={18} color={colors.white} />
            <Text style={styles.saveText}>保存收藏状态</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(59, 29, 18, 0.44)',
  },
  sheet: {
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.lineStrong,
    padding: 18,
    paddingBottom: 28,
    backgroundColor: colors.paperWarm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  kicker: {
    color: colors.redDark,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.shelf,
  },
  label: {
    marginTop: 14,
    marginBottom: 8,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  note: {
    minHeight: 86,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: 12,
    color: colors.ink,
    backgroundColor: colors.cream,
    textAlignVertical: 'top',
  },
  saveButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    borderRadius: radii.md,
    backgroundColor: colors.redDark,
  },
  saveText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
});
