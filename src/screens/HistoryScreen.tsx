import { useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RecommendationView, formatYen, profileSummary } from '../components/RecommendationView';
import { HistoryEntry } from '../storage/history';
import { colors, radius, spacing } from '../theme';

interface Props {
  history: HistoryEntry[];
  onClear: () => void;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function HistoryScreen({ history, onClear }: Props) {
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

  if (selected) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => setSelected(null)} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ 履歴一覧へ</Text>
        </Pressable>
        <Text style={styles.date}>{formatDate(selected.createdAt)}</Text>
        <RecommendationView profile={selected.profile} result={selected.result} />
      </ScrollView>
    );
  }

  const confirmClear = () =>
    Alert.alert('履歴を削除', 'すべての診断履歴を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: onClear },
    ]);

  return (
    <FlatList
      data={history}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      ListEmptyComponent={<Text style={styles.empty}>まだ診断履歴がありません。{'\n'}「診断」タブから肌診断をしてみましょう。</Text>}
      ListHeaderComponent={
        history.length > 0 ? (
          <View style={styles.header}>
            <Text style={styles.headerText}>肌状態の推移を振り返れます</Text>
            <Pressable onPress={confirmClear} accessibilityRole="button">
              <Text style={styles.clear}>すべて削除</Text>
            </Pressable>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => setSelected(item)} style={styles.row} accessibilityRole="button">
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.summary}>{profileSummary(item.profile)}</Text>
          <Text style={styles.total}>合計 {formatYen(item.result.totalPrice)}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  headerText: { fontSize: 13, color: colors.subText },
  clear: { fontSize: 13, color: colors.primaryDark, fontWeight: '600' },
  empty: { marginTop: 80, textAlign: 'center', color: colors.subText, lineHeight: 22 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  date: { fontSize: 12, color: colors.subText, marginBottom: spacing.xs },
  summary: { fontSize: 14, color: colors.text, lineHeight: 20 },
  total: { marginTop: spacing.xs, fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  back: { marginBottom: spacing.sm },
  backText: { fontSize: 15, color: colors.primaryDark, fontWeight: '600' },
});
