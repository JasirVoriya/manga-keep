import React from 'react';
import { Pressable, Text, StyleSheet, StyleProp, ViewStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '../styles/themeContext';
import { radii } from '../styles/constants';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ActionButton({ title, onPress, variant = 'primary', isLoading, disabled, style }: Props) {
  const { theme } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'danger': return { bg: theme.danger, text: theme.textOnBrand, border: theme.danger };
      case 'secondary': return { bg: theme.surface, text: theme.textPrimary, border: theme.borderStrong };
      case 'primary': default: return { bg: theme.brand, text: theme.textOnBrand, border: theme.brand };
    }
  };

  const colors = getColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.bg, borderColor: colors.border },
        (pressed || disabled) && { opacity: 0.7 },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={[styles.text, { color: colors.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
