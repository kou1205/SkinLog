/**
 * Gemini を1回だけ呼んで、Google検索での裏付けがどう働いたかを確認するスクリプト。
 * アプリと同じプロンプト・設定を使い、キャッシュは使わない。
 *
 *   npm run try-gemini
 *   npm run try-gemini -- --gender male --age 20s --budget low --skin oily --concerns acne,pores
 *   npm run try-gemini -- --no-search      # 検索なしと比べる
 *   npm run try-gemini -- --raw            # Gemini の生の回答も表示
 */
import { STEP_LABELS } from '../src/constants/labels';
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_ENDPOINT,
  GeminiError,
  GeminiResponse,
  buildRequestBody,
  describeHttpError,
  parseGeminiResponse,
  quotaViolations,
  readErrorBody,
} from '../src/ai/gemini';
import { AgeGroup, Budget, Gender, SkinConcern, SkinType, UserProfile } from '../src/types';

try {
  process.loadEnvFile('.env');
} catch {
  // .env が無くても環境変数で渡せる
}

const args = process.argv.slice(2);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const profile: UserProfile = {
  gender: (option('gender') ?? 'female') as Gender,
  ageGroup: (option('age') ?? '30s') as AgeGroup,
  budget: (option('budget') ?? 'mid') as Budget,
  skinType: (option('skin') ?? 'dry') as SkinType,
  concerns: (option('concerns') ?? 'dehydration').split(',').filter(Boolean) as SkinConcern[],
};
const grounding = !args.includes('--no-search');
const showRaw = args.includes('--raw');
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const model = process.env.EXPO_PUBLIC_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

const main = async () => {
  if (!apiKey) {
    console.error('EXPO_PUBLIC_GEMINI_API_KEY が .env にありません');
    process.exit(1);
  }

  console.log(`モデル: ${model} / Google検索: ${grounding ? 'あり' : 'なし'}`);
  console.log(`条件: ${JSON.stringify(profile)}\n`);

  const started = Date.now();
  const res = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(buildRequestBody(profile, { grounding })),
  });
  console.log(`HTTP ${res.status}（${((Date.now() - started) / 1000).toFixed(1)}秒）\n`);

  if (!res.ok) {
    const body = await readErrorBody(res);
    console.log(describeHttpError(res.status, body));
    for (const v of quotaViolations(body)) {
      console.log(`  上限の種類: ${v.quotaId ?? '-'}  対象: ${v.quotaMetric ?? '-'}  上限値: ${v.quotaValue ?? '-'}`);
    }
    if (showRaw) console.log(JSON.stringify(body, null, 2));
    process.exit(1);
  }

  const data = (await res.json()) as GeminiResponse & { usageMetadata?: unknown };
  if (showRaw) console.log(JSON.stringify(data, null, 2), '\n');

  const meta = data.candidates?.[0]?.groundingMetadata;
  console.log('■ Geminiが検索したキーワード');
  console.log(meta?.webSearchQueries?.length ? meta.webSearchQueries.map((q) => `  - ${q}`).join('\n') : '  （検索していません）');

  try {
    const result = parseGeminiResponse(data, profile);
    console.log('\n■ 提案された商品');
    for (const item of result.items) {
      const price = item.product.price ? `¥${item.product.price.toLocaleString('ja-JP')}` : '価格不明';
      const over = item.overBudget ? ' ⚠予算超過' : '';
      console.log(`  ${STEP_LABELS[item.step]}: ${item.product.brand} ${item.product.name}（${price}${over}）`);
      if (item.reasons[0]) console.log(`      理由: ${item.reasons[0]}`);
    }
    console.log('\n■ 参照したページ');
    console.log(result.sources?.length ? result.sources.map((s) => `  - ${s.title}  ${s.uri}`).join('\n') : '  （なし）');
    console.log('\n■ アドバイス');
    console.log(result.tips.map((t) => `  - ${t}`).join('\n') || '  （なし）');
  } catch (e) {
    console.log(`\n回答を読み取れませんでした: ${e instanceof GeminiError ? e.message : String(e)}`);
    console.log('--raw を付けると生の回答を確認できます');
    process.exit(1);
  }
  if (data.usageMetadata) console.log(`\n使用トークン: ${JSON.stringify(data.usageMetadata)}`);
};

main();
