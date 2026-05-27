import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { radii } from '../styles/constants';
import { useTheme } from '../styles/themeContext';
import type { ThemeTokens } from '../styles/themes/types';

type Props = {
  visible: boolean;
  backupText: string;
  onChangeBackupText: (value: string) => void;
  onClose: () => void;
  onCreateCatalog: () => void;
  onExportRecords: () => void;
  onImportRecords: () => void;
  onExportCurrentCatalog: () => void;
  onImportCatalog: () => void;
};

export function ToolsModal({
  visible,
  backupText,
  onChangeBackupText,
  onClose,
  onCreateCatalog,
  onExportRecords,
  onImportRecords,
  onExportCurrentCatalog,
  onImportCatalog,
}: Props) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>本地数据</Text>
              <Text style={styles.title}>目录与备份</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="关闭工具" onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color={theme.textOnBrand} />
            </Pressable>
          </View>

          <View style={styles.actions}>
            <ToolButton theme={theme} styles={styles} icon="book-plus-outline" label="新建目录" onPress={onCreateCatalog} />
            <ToolButton theme={theme} styles={styles} icon="database-export-outline" label="导出目录" onPress={onExportCurrentCatalog} />
            <ToolButton theme={theme} styles={styles} icon="database-import-outline" label="导入目录" onPress={onImportCatalog} />
            <ToolButton theme={theme} styles={styles} icon="download-box-outline" label="导出收藏" onPress={onExportRecords} />
            <ToolButton theme={theme} styles={styles} icon="upload-box-outline" label="导入收藏" onPress={onImportRecords} />
          </View>

          <TextInput
            multiline
            value={backupText}
            onChangeText={onChangeBackupText}
            placeholder="JSON 会显示在这里，也可以粘贴目录或收藏备份再导入"
            placeholderTextColor={theme.textMuted}
            style={styles.backupInput}
          />
        </View>
      </View>
    </Modal>
  );
}

function ToolButton({
  theme,
  styles,
  icon,
  label,
  onPress,
}: {
  theme: ThemeTokens;
  styles: any;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.actionButton}>
      <MaterialCommunityIcons name={icon} size={16} color={theme.brand} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const getStyles = (theme: ThemeTokens) => StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: theme.borderStrong,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: theme.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  kicker: {
    color: theme.brand,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: theme.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: theme.brand,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  actionButton: {
    minWidth: 104,
    height: 38,
    flexGrow: 1,
    flexBasis: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    paddingHorizontal: 10,
    backgroundColor: theme.surfaceRaised,
  },
  actionText: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  backupInput: {
    minHeight: 120,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    padding: 10,
    color: theme.textPrimary,
    backgroundColor: theme.surfaceRaised,
    fontSize: 12,
    textAlignVertical: 'top',
  },
});
