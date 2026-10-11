import { BUDGET_LIMITS, STEP_ORDER } from '../constants/labels';
import { PRODUCTS } from '../data/products';
import { Product, UserProfile } from '../types';
import { recommend, scoreProduct } from './recommend';

const baseProfile: UserProfile = {
  gender: 'female',
  ageGroup: '20s',
  budget: 'mid',
  skinType: 'normal',
  concerns: [],
};

describe('recommend', () => {
  it('returns one product for every routine step in order', () => {
    const result = recommend(baseProfile);
    expect(result.items.map((i) => i.step)).toEqual(STEP_ORDER);
  });

  it('keeps every product within the budget limit', () => {
    for (const budget of ['low', 'mid'] as const) {
      const result = recommend({ ...baseProfile, budget });
      for (const item of result.items) {
        expect(item.overBudget).toBe(false);
        expect(item.product.price).toBeLessThanOrEqual(BUDGET_LIMITS[budget]);
      }
    }
  });

  it('totals the price of recommended items', () => {
    const result = recommend(baseProfile);
    const sum = result.items.reduce((s, i) => s + i.product.price, 0);
    expect(result.totalPrice).toBe(sum);
  });

  it('never recommends products to avoid for sensitive skin', () => {
    const result = recommend({ ...baseProfile, skinType: 'sensitive', concerns: ['wrinkles', 'pores'], budget: 'high' });
    for (const item of result.items) {
      expect(item.product.avoidFor ?? []).not.toContain('sensitive');
    }
  });

  it('does not recommend retinol to teens', () => {
    const result = recommend({ ...baseProfile, ageGroup: 'teens', concerns: ['wrinkles'], budget: 'high' });
    for (const item of result.items) {
      expect(item.product.avoidAgeGroups ?? []).not.toContain('teens');
    }
  });

  it('prefers acne-care products for oily, acne-prone skin', () => {
    const result = recommend({ ...baseProfile, skinType: 'oily', concerns: ['acne'] });
    const serum = result.items.find((i) => i.step === 'serum');
    expect(serum?.product.concerns).toContain('acne');
  });

  it('prefers men-targeted products for men', () => {
    const result = recommend({ ...baseProfile, gender: 'male', skinType: 'oily', budget: 'low' });
    expect(result.items.some((i) => i.product.targetGender === 'male')).toBe(true);
  });

  it('does not recommend men-targeted products to women', () => {
    const result = recommend({ ...baseProfile, skinType: 'oily', budget: 'low' });
    expect(result.items.every((i) => i.product.targetGender !== 'male')).toBe(true);
  });

  it('falls back to the cheapest product and flags it when nothing fits the budget', () => {
    const catalog: Product[] = [
      { id: 'x', name: 'X', step: 'serum', price: 9000, keyIngredients: [], skinTypes: ['normal'], concerns: [] },
      { id: 'y', name: 'Y', step: 'serum', price: 5000, keyIngredients: [], skinTypes: [], concerns: [] },
    ];
    const result = recommend({ ...baseProfile, budget: 'low' }, catalog);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].product.id).toBe('y');
    expect(result.items[0].overBudget).toBe(true);
  });

  it('always includes at least one tip', () => {
    expect(recommend(baseProfile).tips.length).toBeGreaterThan(0);
  });
});

describe('scoreProduct', () => {
  it('adds points per matched concern and explains why', () => {
    const product = PRODUCTS.find((p) => p.id === 'sr-niacinamide')!;
    const scored = scoreProduct(product, { ...baseProfile, skinType: 'oily', concerns: ['acne', 'pores'] });
    expect(scored.score).toBe(3 + 2 * 2);
    expect(scored.reasons).toEqual(['脂性肌向け', 'ニキビ・毛穴にアプローチ']);
  });
});
