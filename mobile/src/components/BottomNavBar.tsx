import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../styles/themeContext';
import type { ThemeTokens } from '../styles/themes/types';

type NavItem = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  routeName: string;
};

const items: NavItem[] = [
  { icon: 'home-variant', label: '书架', routeName: 'Library' },
  { icon: 'account-outline', label: '关于', routeName: 'About' },
];

export function BottomNavBar() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const active = route.name === item.routeName;
        return (
          <Pressable
            key={item.routeName}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`前往${item.label}`}
            onPress={() => {
              if (!active) {
                navigation.navigate(item.routeName);
              }
            }}
            style={styles.item}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={24}
              color={active ? theme.brand : theme.textPrimary}
            />
            <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const getStyles = (theme: ThemeTokens) => StyleSheet.create({
  wrap: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: theme.surface,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    color: theme.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  activeLabel: {
    color: theme.brand,
  },
});
