import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { RecommendationView } from './src/components/RecommendationView';
import { recommend } from './src/logic/recommend';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ProfileFormScreen } from './src/screens/ProfileFormScreen';
import { HistoryEntry, clearHistory, loadHistory, saveHistoryEntry } from './src/storage/history';
import { colors, radius, spacing } from './src/theme';
import { RecommendationResult, UserProfile } from './src/types';

type Tab = 'diagnose' | 'history';

export default function App() {
  const [tab, setTab] = useState<Tab>('diagnose');
  const [profile, setProfile] = useState<UserProfile | undefined>();
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  const handleSubmit = async (next: UserProfile) => {
    const nextResult = recommend(next);
    setProfile(next);
    setResult(nextResult);
    setHistory(await saveHistoryEntry(next, nextResult));
  };

  const handleClearHistory = async () => {
    await clearHistory();
    setHistory([]);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.title}>SkinLog</Text>
        </View>

        <View style={styles.body}>
          {tab === 'history' ? (
            <HistoryScreen history={history} onClear={handleClearHistory} />
          ) : result && profile ? (
            <ScrollView contentContainerStyle={styles.resultContent}>
              <RecommendationView profile={profile} result={result} />
              <Pressable onPress={() => setResult(null)} style={styles.retry} accessibilityRole="button">
                <Text style={styles.retryText}>条件を変えてもう一度診断する</Text>
              </Pressable>
            </ScrollView>
          ) : (
            <ProfileFormScreen initialProfile={profile} onSubmit={handleSubmit} />
          )}
        </View>

        <View style={styles.tabBar}>
          <TabButton label="診断" active={tab === 'diagnose'} onPress={() => setTab('diagnose')} />
          <TabButton label={`履歴 (${history.length})`} active={tab === 'history'} onPress={() => setTab('history')} />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: active }}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  title: { fontSize: 24, fontWeight: '800', color: colors.primaryDark },
  body: { flex: 1 },
  resultContent: { padding: spacing.md },
  retry: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  retryText: { color: colors.primaryDark, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 14, color: colors.subText, fontWeight: '600' },
  tabTextActive: { color: colors.primaryDark },
});
