import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChoiceChips } from '../components/ChoiceChips';
import {
  AGE_OPTIONS,
  BUDGET_OPTIONS,
  CONCERN_OPTIONS,
  GENDER_OPTIONS,
  SKIN_TYPE_OPTIONS,
} from '../constants/labels';
import { colors, radius, spacing } from '../theme';
import { AgeGroup, Budget, Gender, SkinConcern, SkinType, UserProfile } from '../types';

interface Props {
  initialProfile?: UserProfile;
  onSubmit: (profile: UserProfile) => void;
}

export function ProfileFormScreen({ initialProfile, onSubmit }: Props) {
  const [gender, setGender] = useState<Gender | undefined>(initialProfile?.gender);
  const [ageGroup, setAgeGroup] = useState<AgeGroup | undefined>(initialProfile?.ageGroup);
  const [budget, setBudget] = useState<Budget | undefined>(initialProfile?.budget);
  const [skinType, setSkinType] = useState<SkinType | undefined>(initialProfile?.skinType);
  const [concerns, setConcerns] = useState<SkinConcern[]>(initialProfile?.concerns ?? []);

  const toggleConcern = (value: SkinConcern) =>
    setConcerns((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));

  const canSubmit = gender && ageGroup && budget && skinType;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ gender, ageGroup, budget, skinType, concerns });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>あなたに合わせたスキンケアを提案します。{'\n'}当てはまるものを選んでください。</Text>

        <Section title="性別">
          <ChoiceChips options={GENDER_OPTIONS} selected={gender ? [gender] : []} onToggle={setGender} />
        </Section>

        <Section title="年齢">
          <ChoiceChips options={AGE_OPTIONS} selected={ageGroup ? [ageGroup] : []} onToggle={setAgeGroup} />
        </Section>

        <Section title="予算">
          <ChoiceChips options={BUDGET_OPTIONS} selected={budget ? [budget] : []} onToggle={setBudget} />
        </Section>

        <Section title="肌質">
          <ChoiceChips options={SKIN_TYPE_OPTIONS} selected={skinType ? [skinType] : []} onToggle={setSkinType} />
        </Section>

        <Section title="肌悩み" hint="複数選択可・任意">
          <ChoiceChips options={CONCERN_OPTIONS} selected={concerns} onToggle={toggleConcern} />
        </Section>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [styles.button, !canSubmit && styles.buttonDisabled, pressed && styles.buttonPressed]}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>{canSubmit ? 'おすすめを見る' : '性別・年齢・予算・肌質を選択してください'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.lg },
  lead: { fontSize: 14, lineHeight: 21, color: colors.subText, marginBottom: spacing.md },
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  sectionHint: { fontSize: 12, color: colors.subText },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#D9C4C7' },
  buttonPressed: { backgroundColor: colors.primaryDark },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
