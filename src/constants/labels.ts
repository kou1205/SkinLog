import { AgeGroup, Budget, Gender, RoutineStep, SkinConcern, SkinType } from '../types';

export interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export const GENDER_OPTIONS: Option<Gender>[] = [
  { value: 'female', label: '女性' },
  { value: 'male', label: '男性' },
  { value: 'other', label: 'その他・回答しない' },
];

export const AGE_OPTIONS: Option<AgeGroup>[] = [
  { value: 'teens', label: '10代' },
  { value: '20s', label: '20代' },
  { value: '30s', label: '30代' },
  { value: '40s', label: '40代' },
  { value: '50plus', label: '50代以上' },
];

export const BUDGET_OPTIONS: Option<Budget>[] = [
  { value: 'low', label: 'プチプラ', description: '1品 〜¥1,500' },
  { value: 'mid', label: 'ミドル', description: '1品 〜¥4,000' },
  { value: 'high', label: 'デパコス', description: '上限なし' },
];

/** 予算帯ごとの1品あたり上限価格（円） */
export const BUDGET_LIMITS: Record<Budget, number> = {
  low: 1500,
  mid: 4000,
  high: Number.POSITIVE_INFINITY,
};

export const SKIN_TYPE_OPTIONS: Option<SkinType>[] = [
  { value: 'dry', label: '乾燥肌', description: 'つっぱる・粉をふく' },
  { value: 'oily', label: '脂性肌', description: 'テカリ・ベタつき' },
  { value: 'combination', label: '混合肌', description: 'Tゾーンだけテカる' },
  { value: 'normal', label: '普通肌', description: '特に気にならない' },
  { value: 'sensitive', label: '敏感肌', description: 'ヒリつき・かぶれやすい' },
];

export const CONCERN_OPTIONS: Option<SkinConcern>[] = [
  { value: 'acne', label: 'ニキビ' },
  { value: 'pores', label: '毛穴' },
  { value: 'dullness', label: 'くすみ・シミ' },
  { value: 'wrinkles', label: 'シワ・たるみ' },
  { value: 'redness', label: '赤み' },
  { value: 'dehydration', label: 'インナードライ' },
];

export const STEP_LABELS: Record<RoutineStep, string> = {
  cleanser: '洗顔',
  toner: '化粧水',
  serum: '美容液',
  moisturizer: '保湿（乳液・クリーム）',
  sunscreen: '日焼け止め',
};

export const STEP_ORDER: RoutineStep[] = ['cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen'];

export const labelOf = <T extends string>(options: Option<T>[], value: T): string =>
  options.find((o) => o.value === value)?.label ?? value;
