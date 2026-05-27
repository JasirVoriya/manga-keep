import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { radii } from '../styles/constants';
import { useTheme } from '../styles/themeContext';
import type { ThemeTokens } from '../styles/themes/types';
import type { ComicCatalog } from '../types';

type Props = {
  catalogs: ComicCatalog[];
  selectedCatalogId: string;
  onSelectCatalog: (catalogId: string) => void;
};

export function CatalogSwitcher({ catalogs, selectedCatalogId, onSelectCatalog }: Props) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  if (catalogs.length <= 1) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {catalogs.map((catalog) => {
          const selected = catalog.id === selectedCatalogId;
          return (
            <Pressable
              key={catalog.id}
              accessibilityRole="button"
              accessibilityLabel={`切换到${catalog.name}`}
              accessibilityState={{ selected }}
              onPress={() => onSelectCatalog(catalog.id)}
              style={[styles.tab, selected && styles.selectedTab]}
            >
              <Text style={[styles.tabText, selected && styles.selectedTabText]}>{catalog.shortName}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const getStyles = (theme: ThemeTokens) => StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  content: {
    gap: 8,
    paddingRight: 4,
  },
  tab: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    paddingHorizontal: 12,
    backgroundColor: theme.surfaceRaised,
  },
  selectedTab: {
    borderColor: theme.brand,
    backgroundColor: theme.brand,
  },
  tabText: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  selectedTabText: {
    color: theme.textOnBrand,
  },
});
