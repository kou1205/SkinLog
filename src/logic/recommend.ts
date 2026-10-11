import { BUDGET_LIMITS, CONCERN_OPTIONS, SKIN_TYPE_OPTIONS, STEP_ORDER, labelOf } from '../constants/labels';
import { PRODUCTS } from '../data/products';
import { Product, Recommendation, RecommendationResult, UserProfile } from '../types';

const SCORE = {
  skinTypeMatch: 3,
  concernMatch: 2,
  ageMatch: 1,
  genderMatch: 1,
  genderMismatch: -2,
} as const;

interface Scored {
  product: Product;
  score: number;
  reasons: string[];
}

/** 肌質・年代的に避けるべき商品か */
const isUnsuitable = (product: Product, profile: UserProfile): boolean =>
  (product.avoidFor?.includes(profile.skinType) ?? false) ||
  (product.avoidAgeGroups?.includes(profile.ageGroup) ?? false);

export const scoreProduct = (product: Product, profile: UserProfile): Scored => {
  let score = 0;
  const reasons: string[] = [];

  if (product.skinTypes.includes(profile.skinType)) {
    score += SCORE.skinTypeMatch;
    reasons.push(`${labelOf(SKIN_TYPE_OPTIONS, profile.skinType)}向け`);
  }

  const matchedConcerns = profile.concerns.filter((c) => product.concerns.includes(c));
  if (matchedConcerns.length > 0) {
    score += matchedConcerns.length * SCORE.concernMatch;
    reasons.push(`${matchedConcerns.map((c) => labelOf(CONCERN_OPTIONS, c)).join('・')}にアプローチ`);
  }

  if (product.ageGroups?.includes(profile.ageGroup)) {
    score += SCORE.ageMatch;
    reasons.push('年代に合ったケア');
  }

  if (product.targetGender && profile.gender !== 'other') {
    if (product.targetGender === profile.gender) {
      score += SCORE.genderMatch;
      reasons.push(product.targetGender === 'male' ? 'メンズ向け処方' : 'レディース向け処方');
    } else {
      score += SCORE.genderMismatch;
    }
  }

  return { product, score, reasons };
};

const byScoreThenPrice = (a: Scored, b: Scored): number =>
  b.score - a.score || a.product.price - b.product.price;

const buildTips = (profile: UserProfile): string[] => {
  const tips: string[] = [];
  if (profile.skinType === 'sensitive') {
    tips.push('新しいアイテムは腕の内側などでパッチテストしてから使いましょう。');
  }
  if (profile.skinType === 'oily' || profile.concerns.includes('dehydration')) {
    tips.push('皮脂が多くても保湿は必須。水分不足は皮脂の過剰分泌につながります。');
  }
  if (profile.concerns.includes('acne')) {
    tips.push('ニキビは触らず、枕カバーやマスクを清潔に保ちましょう。');
  }
  if (profile.concerns.includes('dullness') || profile.concerns.includes('wrinkles')) {
    tips.push('シミ・シワ対策の基本は紫外線対策。日焼け止めは季節を問わず毎日使いましょう。');
  }
  if (profile.concerns.includes('wrinkles') && profile.ageGroup !== 'teens' && profile.skinType !== 'sensitive') {
    tips.push('レチノールは夜のみ・少量から始めると刺激を抑えられます。');
  }
  if (tips.length === 0) {
    tips.push('「洗う・うるおす・守る」の基本を毎日続けることが一番の近道です。');
  }
  return tips;
};

export const recommend = (profile: UserProfile, catalog: Product[] = PRODUCTS): RecommendationResult => {
  const limit = BUDGET_LIMITS[profile.budget];
  const items: Recommendation[] = [];

  for (const step of STEP_ORDER) {
    const candidates = catalog
      .filter((p) => p.step === step && !isUnsuitable(p, profile))
      .map((p) => scoreProduct(p, profile));

    const inBudget = candidates.filter((c) => c.product.price <= limit).sort(byScoreThenPrice);
    if (inBudget.length > 0) {
      items.push({ step, ...inBudget[0], overBudget: false });
      continue;
    }

    // 予算内に候補がなければ、最も安い商品を予算超過として提示する
    const cheapest = [...candidates].sort((a, b) => a.product.price - b.product.price || b.score - a.score)[0];
    if (cheapest) {
      items.push({ step, ...cheapest, overBudget: true });
    }
  }

  return {
    items,
    totalPrice: items.reduce((sum, i) => sum + i.product.price, 0),
    tips: buildTips(profile),
  };
};
