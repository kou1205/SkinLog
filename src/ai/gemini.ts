import {
  AGE_OPTIONS,
  BUDGET_LIMITS,
  BUDGET_OPTIONS,
  CONCERN_OPTIONS,
  GENDER_OPTIONS,
  SKIN_TYPE_OPTIONS,
  STEP_LABELS,
  STEP_ORDER,
  labelOf,
} from '../constants/labels';
import { Recommendation, RecommendationResult, RoutineStep, SourceLink, UserProfile } from '../types';

export const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
/** プロンプトや出力形式を変えたら上げる（古いキャッシュを使わないため） */
export const PROMPT_VERSION = 1;

/**
 * 回答の揺らぎを抑える生成設定。
 * temperature 0 / topK 1 で最も確率の高い出力に寄せ、seed を固定する。
 * それでも完全には一致しないため、同じ条件の結果はキャッシュして使い回す（cache.ts）。
 */
export const GENERATION_CONFIG = {
  temperature: 0,
  topK: 1,
  topP: 1,
  seed: 20261012,
  candidateCount: 1,
} as const;

const SYSTEM_INSTRUCTION = `あなたは日本の化粧品に詳しいスキンケアアドバイザーです。
ユーザーの条件に合わせて、日本で現在購入できる実在のスキンケア商品を提案します。

厳守するルール:
- Google検索で実在と販売を確認できた商品だけを挙げる。架空の商品・存在が不確かな商品は挙げない。
- ブランド名と商品名は公式の正式名称で書く。
- priceYen は日本国内の一般的な税込価格（円・整数）。分からなければ null。
- 予算の上限を超える商品は避ける。どうしても無い場合のみ最も手頃な商品を挙げる。
- 敏感肌には刺激になりやすい成分（高濃度レチノール、サリチル酸、アルコール高配合など）を避ける。10代にはレチノールを勧めない。
- 化粧品の効能表現は薬機法の範囲にとどめる。「治る」「消える」「改善する」などの表現は使わない。
- 同じ条件なら毎回同じ商品を選ぶ。迷う場合は「知名度が高く、長く定番として販売されている商品」を優先し、それでも決まらなければ価格の安い方を選ぶ。
- 出力は指定のJSONのみ。説明文やコードブロック記号は付けない。`;

const OUTPUT_FORMAT = `{
  "items": [
    {
      "step": "cleanser" | "toner" | "serum" | "moisturizer" | "sunscreen",
      "brand": "ブランド名",
      "name": "商品名",
      "priceYen": 1650 または null,
      "keyIngredients": ["主な成分", "..."],
      "reason": "この人に合う理由（40字以内）"
    }
  ],
  "tips": ["スキンケアのアドバイス（1〜3個）"]
}`;

export const buildPrompt = (profile: UserProfile): string => {
  const limit = BUDGET_LIMITS[profile.budget];
  const budgetText = Number.isFinite(limit) ? `1品あたり税込${limit.toLocaleString('ja-JP')}円以下` : '上限なし';
  const concerns = profile.concerns.length
    ? [...profile.concerns].sort().map((c) => labelOf(CONCERN_OPTIONS, c)).join('、')
    : 'なし';

  return `次の条件の人に、スキンケアのステップごとに最適な商品を1つずつ提案してください。

# 条件
- 性別: ${labelOf(GENDER_OPTIONS, profile.gender)}
- 年代: ${labelOf(AGE_OPTIONS, profile.ageGroup)}
- 肌質: ${labelOf(SKIN_TYPE_OPTIONS, profile.skinType)}
- 肌悩み: ${concerns}
- 予算: ${labelOf(BUDGET_OPTIONS, profile.budget)}（${budgetText}）

# ステップ（この5つすべて、この順で）
${STEP_ORDER.map((s) => `- ${s}: ${STEP_LABELS[s]}`).join('\n')}

# 出力形式（JSONのみ）
${OUTPUT_FORMAT}`;
};

export const buildRequestBody = (profile: UserProfile, { grounding = true }: { grounding?: boolean } = {}) => ({
  systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
  contents: [{ role: 'user', parts: [{ text: buildPrompt(profile) }] }],
  // 実在する商品に絞るため、Google検索で裏付けを取らせる（検索には別枠の利用上限がある）
  ...(grounding ? { tools: [{ google_search: {} }] } : {}),
  generationConfig: GENERATION_CONFIG,
});

// ---- レスポンスの検証 ----

export class GeminiError extends Error {}

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
    groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
  }[];
  promptFeedback?: { blockReason?: string };
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** コードブロックや前後の文章が付いていても、最初の { から最後の } までをJSONとして読む */
export const extractJson = (text: string): unknown => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new GeminiError('AIの回答にJSONが含まれていません');
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new GeminiError('AIの回答をJSONとして読めませんでした');
  }
};

const toSources = (response: GeminiResponse): SourceLink[] => {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: SourceLink[] = [];
  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    sources.push({ uri, title: chunk.web?.title || uri });
  }
  return sources;
};

export const parseGeminiResponse = (response: GeminiResponse, profile: UserProfile): RecommendationResult => {
  if (response.promptFeedback?.blockReason) {
    throw new GeminiError(`AIが回答を拒否しました（${response.promptFeedback.blockReason}）`);
  }
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('');
  if (!text) throw new GeminiError('AIから回答が返ってきませんでした');

  const data = extractJson(text) as { items?: unknown; tips?: unknown };
  if (!Array.isArray(data.items)) throw new GeminiError('AIの回答に商品リストがありません');

  const limit = BUDGET_LIMITS[profile.budget];
  const byStep = new Map<RoutineStep, Recommendation>();

  for (const raw of data.items as Record<string, unknown>[]) {
    const step = raw?.step as RoutineStep;
    if (!STEP_ORDER.includes(step) || byStep.has(step)) continue;
    if (!isNonEmptyString(raw.brand) || !isNonEmptyString(raw.name)) continue;

    const price =
      typeof raw.priceYen === 'number' && Number.isFinite(raw.priceYen) && raw.priceYen > 0
        ? Math.round(raw.priceYen)
        : 0;
    const keyIngredients = Array.isArray(raw.keyIngredients) ? raw.keyIngredients.filter(isNonEmptyString) : [];

    byStep.set(step, {
      step,
      product: {
        id: `gemini:${step}:${raw.brand.trim()}:${raw.name.trim()}`,
        brand: raw.brand.trim(),
        name: raw.name.trim(),
        step,
        price,
        keyIngredients,
        skinTypes: [],
        concerns: [],
      },
      score: 0,
      reasons: isNonEmptyString(raw.reason) ? [raw.reason.trim()] : [],
      overBudget: price > limit,
    });
  }

  const missing = STEP_ORDER.filter((s) => !byStep.has(s));
  if (missing.length > 0) {
    throw new GeminiError(`AIの回答に不足があります（${missing.map((s) => STEP_LABELS[s]).join('・')}）`);
  }

  const items = STEP_ORDER.map((s) => byStep.get(s)!);
  const tips = Array.isArray(data.tips) ? data.tips.filter(isNonEmptyString).slice(0, 3) : [];

  return {
    items,
    totalPrice: items.reduce((sum, i) => sum + i.product.price, 0),
    tips,
    source: 'gemini',
    sources: toSources(response),
  };
};

// ---- API呼び出し ----

interface GeminiErrorBody {
  error?: { message?: unknown; details?: { '@type'?: string; retryDelay?: unknown }[] };
}

/** Google が返すエラー本文から、画面に出す説明を作る */
export const describeHttpError = (status: number, body: GeminiErrorBody | null): string => {
  if (status === 429) {
    const retry = body?.error?.details?.find((d) => d['@type']?.endsWith('RetryInfo'))?.retryDelay;
    const seconds = typeof retry === 'string' ? Math.ceil(parseFloat(retry)) : NaN;
    const wait = Number.isFinite(seconds) ? `約${seconds}秒後に再試行できます` : 'しばらく待ってから再試行してください';
    return `Gemini APIの利用上限に達しました（HTTP 429・${wait}）`;
  }
  const message = body?.error?.message;
  const detail = typeof message === 'string' && message ? `: ${message.slice(0, 200)}` : '';
  return `Gemini APIエラー（HTTP ${status}${detail}）`;
};

const readErrorBody = async (res: Response): Promise<GeminiErrorBody | null> => {
  try {
    return (await res.json()) as GeminiErrorBody;
  } catch {
    return null;
  }
};

export interface GeminiOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  grounding?: boolean;
}

export const fetchGeminiRecommendation = async (
  profile: UserProfile,
  { apiKey, model = DEFAULT_GEMINI_MODEL, fetchImpl = fetch, timeoutMs = 60000, grounding = true }: GeminiOptions,
): Promise<RecommendationResult> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(buildRequestBody(profile, { grounding })),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new GeminiError(describeHttpError(res.status, await readErrorBody(res)));
    }
    return parseGeminiResponse((await res.json()) as GeminiResponse, profile);
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    if ((e as Error)?.name === 'AbortError') throw new GeminiError('AIの応答がタイムアウトしました');
    throw new GeminiError('AIに接続できませんでした');
  } finally {
    clearTimeout(timer);
  }
};
