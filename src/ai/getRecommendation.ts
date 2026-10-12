import { recommend } from '../logic/recommend';
import { RecommendationResult, UserProfile } from '../types';
import { KeyValueStorage, readCachedResult, writeCachedResult } from './cache';
import { DEFAULT_GEMINI_MODEL, GeminiError, PROMPT_VERSION, fetchGeminiRecommendation } from './gemini';
import { createMockFetch } from './mockFetch';

export interface RecommendationDeps {
  apiKey?: string;
  model?: string;
  storage: KeyValueStorage;
  fetchImpl?: typeof fetch;
  /** API を呼ばずにテスト用の回答を使う */
  mock?: boolean;
  /** Google検索での裏付け（既定は有効） */
  grounding?: boolean;
}

/**
 * 1. 同じ条件の結果がキャッシュにあればそれを返す（毎回同じ答え）
 * 2. なければ Gemini に実在商品を聞き、結果をキャッシュする
 * 3. APIキー未設定・通信失敗時は、アプリ内のサンプルカタログで提案する
 * テスト用モードでは API を呼ばず、同じ流れ（検証・キャッシュ・表示）をテスト用の回答で通す
 */
export const getRecommendation = async (
  profile: UserProfile,
  { apiKey, model = DEFAULT_GEMINI_MODEL, storage, fetchImpl, mock = false, grounding = true }: RecommendationDeps,
): Promise<RecommendationResult> => {
  if (mock) {
    const result = await fetchGeminiRecommendation(profile, {
      apiKey: 'mock',
      fetchImpl: createMockFetch(profile),
    });
    return { ...result, notice: 'テスト用モードです（Gemini APIは呼んでいません）。表示内容はサンプルです。' };
  }

  if (!apiKey) {
    return {
      ...recommend(profile),
      source: 'local',
      notice:
        'Gemini APIキーが読み込まれていません。.env に EXPO_PUBLIC_GEMINI_API_KEY を書き、npx expo start --clear で起動し直してください。アプリ内のサンプル商品から提案しています。',
    };
  }

  // 検索の有無で答えが変わるので、キャッシュも分ける
  const cacheModel = grounding ? model : `${model}+no-search`;
  const cached = await readCachedResult(storage, profile, cacheModel, PROMPT_VERSION);
  if (cached) return cached;

  try {
    const result = await fetchGeminiRecommendation(profile, { apiKey, model, fetchImpl, grounding });
    await writeCachedResult(storage, profile, cacheModel, PROMPT_VERSION, result);
    return result;
  } catch (e) {
    const reason = e instanceof GeminiError ? e.message : 'AIでの提案に失敗しました';
    return {
      ...recommend(profile),
      source: 'local',
      notice: `${reason}。アプリ内のサンプル商品から提案しています。`,
    };
  }
};
