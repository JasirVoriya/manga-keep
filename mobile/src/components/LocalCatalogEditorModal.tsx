import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { catalogDefinitionFromInput } from '../storage/localCatalogStorage';
import { colors, radii } from '../styles/theme';
import type { ComicCatalogKind, StoredComicCatalogDefinition } from '../types';
import { SegmentedControl } from './SegmentedControl';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (definition: StoredComicCatalogDefinition) => void;
};

const kindOptions: Array<{ label: string; value: ComicCatalogKind }> = [
  { label: '杂志', value: 'magazine' },
  { label: '单行本', value: 'series' },
  { label: '单册', value: 'one-shot' },
  { label: '画集', value: 'artbook' },
  { label: '特刊', value: 'special' },
];

const defaultInput = {
  id: '',
  name: '',
  shortName: '',
  kind: 'magazine' as ComicCatalogKind,
  issueCount: '',
  numberPadding: '3',
  coverPattern: '',
};

export function LocalCatalogEditorModal({ visible, onClose, onSave }: Props) {
  const [input, setInput] = useState(defaultInput);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setInput(defaultInput);
      setValidationError(null);
    }
  }, [visible]);

  function updateInput<Key extends keyof typeof input>(key: Key, value: (typeof input)[Key]) {
    setInput((current) => ({ ...current, [key]: value }));
    setValidationError(null);
  }

  function handleSave() {
    try {
      onSave(catalogDefinitionFromInput(input));
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : '目录信息不完整。');
    }
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>本地目录</Text>
              <Text style={styles.title}>新建目录</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="关闭新建目录" onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color={colors.white} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <Text style={styles.label}>ID</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              value={input.id}
              onChangeText={(value) => updateInput('id', value)}
              placeholder="例如 doraemon"
              placeholderTextColor="#8b8173"
              style={styles.input}
            />

            <Text style={styles.label}>名称</Text>
            <TextInput
              value={input.name}
              onChangeText={(value) => updateInput('name', value)}
              placeholder="例如 哆啦A梦"
              placeholderTextColor="#8b8173"
              style={styles.input}
            />

            <Text style={styles.label}>短名称</Text>
            <TextInput
              value={input.shortName}
              onChangeText={(value) => updateInput('shortName', value)}
              placeholder="例如 哆啦"
              placeholderTextColor="#8b8173"
              style={styles.input}
            />

            <Text style={styles.label}>类型</Text>
            <SegmentedControl options={kindOptions} value={input.kind} onChange={(value) => updateInput('kind', value)} />

            <View style={styles.numberRow}>
              <View style={styles.numberField}>
                <Text style={styles.label}>总期数</Text>
                <TextInput
                  keyboardType="number-pad"
                  value={input.issueCount}
                  onChangeText={(value) => updateInput('issueCount', value)}
                  placeholder="45"
                  placeholderTextColor="#8b8173"
                  style={styles.input}
                />
              </View>
              <View style={styles.numberField}>
                <Text style={styles.label}>补零位数</Text>
                <TextInput
                  keyboardType="number-pad"
                  value={input.numberPadding}
                  onChangeText={(value) => updateInput('numberPadding', value)}
                  placeholder="3"
                  placeholderTextColor="#8b8173"
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.label}>封面 URL 规则</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              value={input.coverPattern}
              onChangeText={(value) => updateInput('coverPattern', value)}
              placeholder="https://example.com/covers/{padded}.jpg"
              placeholderTextColor="#8b8173"
              style={styles.input}
            />

            {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}

            <Pressable accessibilityRole="button" onPress={handleSave} style={styles.saveButton}>
              <MaterialCommunityIcons name="content-save-check" size={18} color={colors.white} />
              <Text style={styles.saveText}>保存目录</Text>
            </Pressable>
          </ScrollView>
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
    width: '100%',
    maxHeight: '92%',
    maxWidth: 560,
    alignSelf: 'center',
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.lineStrong,
    padding: 18,
    paddingBottom: 24,
    backgroundColor: colors.paperWarm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  form: {
    paddingBottom: 4,
  },
  label: {
    marginTop: 12,
    marginBottom: 7,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  input: {
    minHeight: 42,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: 12,
    color: colors.ink,
    backgroundColor: colors.cream,
    fontSize: 15,
  },
  numberRow: {
    flexDirection: 'row',
    gap: 10,
  },
  numberField: {
    flex: 1,
  },
  errorText: {
    marginTop: 12,
    color: colors.redDark,
    fontSize: 13,
    fontWeight: '800',
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
