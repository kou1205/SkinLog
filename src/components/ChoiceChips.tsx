import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Option } from '../constants/labels';
import { colors, radius, spacing } from '../theme';

interface Props<T extends string> {
  options: Option<T>[];
  selected: T[];
  onToggle: (value: T) => void;
}

export function ChoiceChips<T extends string>({ options, selected, onToggle }: Props<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            onPress={() => onToggle(option.value)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
            {option.description ? (
              <Text style={[styles.description, active && styles.labelActive]}>{option.description}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  labelActive: {
    color: '#FFFFFF',
  },
  description: {
    marginTop: 2,
    fontSize: 11,
    color: colors.subText,
  },
});
