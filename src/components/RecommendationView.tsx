import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AGE_OPTIONS,
  BUDGET_OPTIONS,
  CONCERN_OPTIONS,
  GENDER_OPTIONS,
  SKIN_TYPE_OPTIONS,
  STEP_LABELS,
  labelOf,
} from '../constants/labels';
import { colors, radius, spacing } from '../theme';
import { RecommendationResult, UserProfile } from '../types';

export const formatYen = (value: number) => `¥${value.toLocaleString('ja-JP')}`;

export const profileSummary = (profile: UserProfile): string =>
  [
    labelOf(GENDER_OPTIONS, profile.gender),
    labelOf(AGE_OPTIONS, profile.ageGroup),
    labelOf(SKIN_TYPE_OPTIONS, profile.skinType),
    labelOf(BUDGET_OPTIONS, profile.budget),
    ...profile.concerns.map((c) => labelOf(CONCERN_OPTIONS, c)),
  ].join(' / ');

interface Props {
  profile: UserProfile;
  result: RecommendationResult;
}

export function RecommendationView({ profile, result }: Props) {
  const isAi = result.source === 'gemini';
  const hasUnknownPrice = result.items.some((i) => i.product.price === 0);

  return (
    <View>
      {result.notice ? <Text style={styles.notice}>{result.notice}</Text> : null}
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>あなたの肌プロフィール</Text>
        <Text style={styles.summaryText}>{profileSummary(profile)}</Text>
        <Text style={styles.total}>
          ルーティン合計 {formatYen(result.totalPrice)}
          {hasUnknownPrice ? '〜' : ''}
        </Text>
        <Text style={styles.sourceLabel}>
          {isAi ? 'Gemini が実在の商品から提案（参考価格）' : 'アプリ内のサンプル商品から提案'}
        </Text>
      </View>

      {result.items.map((item, index) => (
        <View key={item.step} style={styles.card}>
          <Text style={styles.step}>
            STEP {index + 1}　{STEP_LABELS[item.step]}
          </Text>
          {item.product.brand ? <Text style={styles.brand}>{item.product.brand}</Text> : null}
          <Text style={styles.name}>{item.product.name}</Text>
          <Text style={styles.price}>
            {item.product.price > 0 ? `${isAi ? '参考価格 ' : ''}${formatYen(item.product.price)}` : '価格情報なし'}
          </Text>
          {item.overBudget ? (
            <Text style={styles.overBudget}>予算を超えています。予算内で条件に合う商品が見つかりませんでした</Text>
          ) : null}
          {item.product.keyIngredients.length > 0 ? (
            <Text style={styles.ingredients}>主な成分：{item.product.keyIngredients.join('、')}</Text>
          ) : null}
          {item.reasons.length > 0 ? (
            <View style={styles.reasons}>
              {item.reasons.map((reason) => (
                <Text key={reason} style={styles.reason}>
                  {reason}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ))}

      {result.tips.length > 0 ? (
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>ワンポイントアドバイス</Text>
          {result.tips.map((tip) => (
            <Text key={tip} style={styles.tip}>
              ・{tip}
            </Text>
          ))}
        </View>
      ) : null}

      {result.sources && result.sources.length > 0 ? (
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>参考にした情報</Text>
          {result.searchQueries && result.searchQueries.length > 0 ? (
            <Text style={styles.searchQueries}>検索したキーワード：{result.searchQueries.join(' / ')}</Text>
          ) : null}
          {result.sources.slice(0, 8).map((src) => (
            <Pressable key={src.uri} onPress={() => Linking.openURL(src.uri)} accessibilityRole="link">
              <Text style={styles.sourceLink} numberOfLines={1}>
                {src.title}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={styles.disclaimer}>
        ※ 提案は一般的な目安です。{isAi ? '商品情報・価格はAIが調べたもので、変更や誤りの可能性があります。購入前に販売ページでご確認ください。' : ''}肌トラブルが続く場合は皮膚科専門医にご相談ください。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryLabel: { fontSize: 12, color: colors.primaryDark, fontWeight: '700' },
  summaryText: { marginTop: spacing.xs, fontSize: 14, color: colors.text, lineHeight: 20 },
  sourceLabel: { marginTop: spacing.xs, fontSize: 11, color: colors.primaryDark },
  notice: {
    marginBottom: spacing.sm,
    fontSize: 12,
    lineHeight: 18,
    color: colors.warning,
    backgroundColor: colors.warningLight,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  searchQueries: { fontSize: 12, lineHeight: 18, color: colors.subText, marginBottom: spacing.xs },
  sourceLink: { fontSize: 13, lineHeight: 22, color: colors.primaryDark, textDecorationLine: 'underline' },
  total: { marginTop: spacing.sm, fontSize: 16, fontWeight: '700', color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  step: { fontSize: 12, fontWeight: '700', color: colors.primary },
  brand: { marginTop: spacing.xs, fontSize: 12, color: colors.subText },
  name: { marginTop: 2, fontSize: 17, fontWeight: '700', color: colors.text },
  price: { marginTop: 2, fontSize: 14, color: colors.subText },
  overBudget: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.warning,
    backgroundColor: colors.warningLight,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  ingredients: { marginTop: spacing.sm, fontSize: 13, color: colors.text },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  reason: {
    fontSize: 12,
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  tips: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  tipsTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  tip: { fontSize: 13, lineHeight: 20, color: colors.text },
  disclaimer: { marginTop: spacing.md, fontSize: 11, color: colors.subText, lineHeight: 16 },
});
