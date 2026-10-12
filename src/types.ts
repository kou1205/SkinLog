export type Gender = 'female' | 'male' | 'other';

export type AgeGroup = 'teens' | '20s' | '30s' | '40s' | '50plus';

/** 1アイテムあたりの予算帯 */
export type Budget = 'low' | 'mid' | 'high';

export type SkinType = 'dry' | 'oily' | 'combination' | 'normal' | 'sensitive';

export type SkinConcern =
  | 'acne'
  | 'pores'
  | 'dullness'
  | 'wrinkles'
  | 'redness'
  | 'dehydration';

export type RoutineStep = 'cleanser' | 'toner' | 'serum' | 'moisturizer' | 'sunscreen';

export interface UserProfile {
  gender: Gender;
  ageGroup: AgeGroup;
  budget: Budget;
  skinType: SkinType;
  concerns: SkinConcern[];
}

export interface Product {
  id: string;
  /** ブランド名（AI提案の実在商品で使用） */
  brand?: string;
  name: string;
  step: RoutineStep;
  /** 税込の参考価格（円） */
  price: number;
  keyIngredients: string[];
  /** 相性の良い肌質 */
  skinTypes: SkinType[];
  /** アプローチできる肌悩み */
  concerns: SkinConcern[];
  /** 特に向いている年代（未指定なら全年代） */
  ageGroups?: AgeGroup[];
  /** 想定ターゲット（未指定ならユニセックス） */
  targetGender?: Exclude<Gender, 'other'>;
  /** この肌質には刺激が強いなど、推奨しない肌質 */
  avoidFor?: SkinType[];
  /** 推奨しない年代 */
  avoidAgeGroups?: AgeGroup[];
}

export interface Recommendation {
  step: RoutineStep;
  product: Product;
  score: number;
  reasons: string[];
  /** 予算内に該当商品がなく、予算超過の商品を提示している */
  overBudget: boolean;
}

export interface SourceLink {
  title: string;
  uri: string;
}

export interface RecommendationResult {
  items: Recommendation[];
  totalPrice: number;
  tips: string[];
  /** 提案の出どころ（未設定の古い履歴はローカル） */
  source?: 'local' | 'gemini';
  /** Google検索グラウンディングで参照したページ */
  sources?: SourceLink[];
  /** Gemini が実際に検索したキーワード */
  searchQueries?: string[];
  /** 画面に表示する補足（AIが使えずローカル提案にした理由など） */
  notice?: string;
}
