import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii } from '../styles/constants';
import { useTheme } from '../styles/themeContext';

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
  const { theme } = useTheme();

  return (
    <View style={[styles.wrap, { borderColor: theme.borderStrong, backgroundColor: theme.surfaceSoft }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[
              styles.item,
              active && { backgroundColor: theme.brand }
            ]}
          >
            <Text style={[
              styles.label,
              { color: active ? theme.textOnBrand : theme.textSecondary }
            ]}>
              {option.label}
            </Text>
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
    overflow: 'hidden',
  },
  item: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
  },
});
