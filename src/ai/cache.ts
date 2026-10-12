import { RecommendationResult, UserProfile } from '../types';

/** AsyncStorage と同じ形。テストではメモリ実装を渡す */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/**
 * 条件を正規化したキー。肌悩みの選択順が違っても同じキーになる。
 * 同じキーなら保存済みの結果を返すことで、AIの回答の揺らぎを完全になくす。
 */
export const profileKey = (profile: UserProfile): string =>
  [profile.gender, profile.ageGroup, profile.budget, profile.skinType, [...new Set(profile.concerns)].sort().join('+')].join('|');

const storageKey = (profile: UserProfile, model: string, promptVersion: number) =>
  `skinlog/ai-cache/v${promptVersion}/${model}/${profileKey(profile)}`;

export const readCachedResult = async (
  storage: KeyValueStorage,
  profile: UserProfile,
  model: string,
  promptVersion: number,
): Promise<RecommendationResult | null> => {
  try {
    const raw = await storage.getItem(storageKey(profile, model, promptVersion));
    return raw ? (JSON.parse(raw) as RecommendationResult) : null;
  } catch {
    return null;
  }
};

export const writeCachedResult = async (
  storage: KeyValueStorage,
  profile: UserProfile,
  model: string,
  promptVersion: number,
  result: RecommendationResult,
): Promise<void> => {
  try {
    await storage.setItem(storageKey(profile, model, promptVersion), JSON.stringify(result));
  } catch {
    // 保存できなくても提案自体は表示する
  }
};
