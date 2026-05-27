import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { radii } from '../styles/constants';
import { useTheme } from '../styles/themeContext';
import type { ThemeTokens } from '../styles/themes/types';
import type { AppUpdateInfo } from '../update/versionCheck';

type Props = {
  updateInfo: AppUpdateInfo | null;
  visible: boolean;
  onDismiss: () => void;
};

function getUpdateUrl(updateInfo: AppUpdateInfo) {
  if (updateInfo.updatePageUrl) return updateInfo.updatePageUrl;
  if (Platform.OS === 'ios') return updateInfo.platforms?.ios?.appStoreUrl ?? updateInfo.platforms?.ios?.testFlightUrl ?? updateInfo.iosUrl ?? updateInfo.downloadUrl ?? updateInfo.releaseNotesUrl;
  if (Platform.OS === 'android') return updateInfo.platforms?.android?.storeUrl ?? updateInfo.platforms?.android?.apkUrl ?? updateInfo.androidUrl ?? updateInfo.downloadUrl ?? updateInfo.releaseNotesUrl;
  return updateInfo.downloadUrl ?? updateInfo.releaseNotesUrl ?? updateInfo.platforms?.android?.storeUrl ?? updateInfo.platforms?.ios?.appStoreUrl ?? updateInfo.androidUrl ?? updateInfo.iosUrl;
}

export function UpdatePromptModal({ updateInfo, visible, onDismiss }: Props) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  if (!updateInfo) return null;
  const info = updateInfo;

  async function openUpdate() {
    const updateUrl = getUpdateUrl(info);
    if (!updateUrl) {
      Alert.alert('暂无更新链接', '版本清单里还没有配置下载地址。');
      return;
    }
    const canOpen = await Linking.canOpenURL(updateUrl);
    if (!canOpen) {
      Alert.alert('无法打开链接', updateUrl);
      return;
    }
    await Linking.openURL(updateUrl);
  }

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={info.forceUpdate ? undefined : onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconBadge}>
            <MaterialCommunityIcons name="cellphone-arrow-down" size={26} color={theme.textOnBrand} />
          </View>
          <Text style={styles.title}>{info.title ?? '发现新版本'}</Text>
          <Text style={styles.versionLine}>
            当前 {info.currentVersion} · 最新 {info.latestVersion}
          </Text>
          <Text style={styles.message}>
            {info.message ?? '新版本已经准备好，建议更新后继续管理你的期刊收藏。'}
          </Text>

          <View style={styles.actions}>
            {!info.forceUpdate && (
              <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={onDismiss}>
                <Text style={styles.secondaryText}>稍后</Text>
              </Pressable>
            )}
            <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={openUpdate}>
              <MaterialCommunityIcons name="open-in-new" size={17} color={theme.textOnBrand} />
              <Text style={styles.primaryText}>去更新</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    padding: 18,
    backgroundColor: theme.surface,
  },
  iconBadge: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
    backgroundColor: theme.brand,
  },
  title: {
    marginTop: 12,
    color: theme.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  versionLine: {
    marginTop: 6,
    color: theme.brand,
    fontSize: 13,
    fontWeight: '800',
  },
  message: {
    marginTop: 12,
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  secondaryButton: {
    minWidth: 96,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surfaceRaised,
  },
  primaryButton: {
    minWidth: 118,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.md,
    backgroundColor: theme.brand,
  },
  secondaryText: {
    color: theme.brand,
    fontSize: 14,
    fontWeight: '900',
  },
  primaryText: {
    color: theme.textOnBrand,
    fontSize: 14,
    fontWeight: '900',
  },
});
