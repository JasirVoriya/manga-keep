import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../styles/theme';

type Option<T extends string> = {
  label: string;
  value: T;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.item, active && styles.activeItem]}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.paperWarm,
    overflow: 'hidden',
  },
  item: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  activeItem: {
    backgroundColor: colors.shelf,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  activeLabel: {
    color: colors.paperWarm,
  },
});
