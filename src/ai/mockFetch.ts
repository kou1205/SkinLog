import { recommend } from '../logic/recommend';
import { UserProfile } from '../types';

/**
 * テスト用モード（EXPO_PUBLIC_GEMINI_MOCK=1）で使う、Gemini API の代わり。
 * API を呼ばずに Gemini と同じ形の回答を返すので、利用上限を気にせず画面や保存の動きを確認できる。
 * 中身はアプリ内のサンプル商品なので、条件を変えると結果も変わる。
 */
export const createMockFetch =
  (profile: UserProfile, delayMs = 800): typeof fetch =>
  async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    const local = recommend(profile);
    const payload = {
      items: local.items.map((i) => ({
        step: i.step,
        brand: '【テスト】サンプルブランド',
        name: i.product.name,
        priceYen: i.product.price,
        keyIngredients: i.product.keyIngredients,
        reason: i.reasons.join('・') || '条件に合わせて選びました',
      })),
      tips: local.tips,
    };
    const body = {
      candidates: [
        {
          content: { parts: [{ text: JSON.stringify(payload) }] },
          groundingMetadata: {
            groundingChunks: [{ web: { uri: 'https://example.com/', title: '【テスト】参照ページの例' } }],
          },
        },
      ],
    };
    return { ok: true, status: 200, json: async () => body } as unknown as Response;
  };
