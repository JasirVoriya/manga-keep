import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { radii } from '../styles/constants';
import { useTheme } from '../styles/themeContext';
import type { ThemeTokens } from '../styles/themes/types';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ToolsModal({ visible, onClose }: Props) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();

  function handleNavigate(route: string) {
    onClose();
    navigation.navigate(route);
  }

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>工具箱</Text>
              <Text style={styles.title}>更多功能</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="关闭工具" onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color={theme.textOnBrand} />
            </Pressable>
          </View>

          <View style={styles.actions}>
            <ToolButton theme={theme} styles={styles} icon="book-search-outline" label="目录广场" onPress={() => handleNavigate('CatalogCenter')} />
            <ToolButton theme={theme} styles={styles} icon="text-box-search-outline" label="补缺清单" onPress={() => handleNavigate('ReplenishmentList')} />
            <ToolButton theme={theme} styles={styles} icon="swap-horizontal" label="导入导出" onPress={() => handleNavigate('ImportExport')} />
            <ToolButton theme={theme} styles={styles} icon="information-outline" label="关于应用" onPress={() => handleNavigate('About')} />
          </View>
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
      <MaterialCommunityIcons name={icon} size={24} color={theme.brand} />
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
    paddingBottom: 40,
    backgroundColor: theme.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
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
    gap: 12,
  },
  actionButton: {
    minWidth: 80,
    height: 80,
    flexGrow: 1,
    flexBasis: '22%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surfaceRaised,
  },
  actionText: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
});
