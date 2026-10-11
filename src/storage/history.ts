import AsyncStorage from '@react-native-async-storage/async-storage';

import { RecommendationResult, UserProfile } from '../types';

const KEY = 'skinlog/history/v1';
const MAX_ENTRIES = 50;

export interface HistoryEntry {
  id: string;
  createdAt: string;
  profile: UserProfile;
  result: RecommendationResult;
}

export const loadHistory = async (): Promise<HistoryEntry[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
};

export const saveHistoryEntry = async (
  profile: UserProfile,
  result: RecommendationResult,
): Promise<HistoryEntry[]> => {
  const entry: HistoryEntry = {
    id: `${Date.now()}`,
    createdAt: new Date().toISOString(),
    profile,
    result,
  };
  const next = [entry, ...(await loadHistory())].slice(0, MAX_ENTRIES);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 保存できない環境（プライベートブラウズ等）でも画面上の履歴は更新する
  }
  return next;
};

export const clearHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // 削除に失敗しても画面上の履歴はクリアする
  }
};
