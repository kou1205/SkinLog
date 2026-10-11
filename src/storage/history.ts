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
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
};

export const clearHistory = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEY);
};
