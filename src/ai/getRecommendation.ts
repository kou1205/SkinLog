import { recommend } from '../logic/recommend';
import { RecommendationResult, UserProfile } from '../types';
import { KeyValueStorage, readCachedResult, writeCachedResult } from './cache';
import { DEFAULT_GEMINI_MODEL, GeminiError, PROMPT_VERSION, fetchGeminiRecommendation } from './gemini';

export interface RecommendationDeps {
  apiKey?: string;
  model?: string;
  storage: KeyValueStorage;
  fetchImpl?: typeof fetch;
}

/**
 * 1. 同じ条件の結果がキャッシュにあればそれを返す（毎回同じ答え）
 * 2. なければ Gemini に実在商品を聞き、結果をキャッシュする
 * 3. APIキー未設定・通信失敗時は、アプリ内のサンプルカタログで提案する
 */
export const getRecommendation = async (
  profile: UserProfile,
  { apiKey, model = DEFAULT_GEMINI_MODEL, storage, fetchImpl }: RecommendationDeps,
): Promise<RecommendationResult> => {
  if (!apiKey) {
    return { ...recommend(profile), source: 'local' };
  }

  const cached = await readCachedResult(storage, profile, model, PROMPT_VERSION);
  if (cached) return cached;

  try {
    const result = await fetchGeminiRecommendation(profile, { apiKey, model, fetchImpl });
    await writeCachedResult(storage, profile, model, PROMPT_VERSION, result);
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
