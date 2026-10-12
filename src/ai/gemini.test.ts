import { KeyValueStorage, profileKey } from './cache';
import {
  GENERATION_CONFIG,
  buildPrompt,
  buildRequestBody,
  describeHttpError,
  extractJson,
  parseGeminiResponse,
} from './gemini';
import { getRecommendation } from './getRecommendation';
import { UserProfile } from '../types';

const profile: UserProfile = {
  gender: 'female',
  ageGroup: '30s',
  budget: 'mid',
  skinType: 'dry',
  concerns: ['wrinkles', 'dehydration'],
};

const item = (step: string, priceYen: number | null = 1650) => ({
  step,
  brand: 'ブランド',
  name: `${step} 商品`,
  priceYen,
  keyIngredients: ['セラミド'],
  reason: '乾燥肌向け',
});

const ALL_STEPS = ['cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen'];

const geminiResponse = (payload: unknown, extra: object = {}) => ({
  candidates: [
    {
      content: { parts: [{ text: typeof payload === 'string' ? payload : JSON.stringify(payload) }] },
      groundingMetadata: {
        groundingChunks: [
          { web: { uri: 'https://example.com/a', title: '商品A' } },
          { web: { uri: 'https://example.com/a', title: '商品A' } },
          { web: { uri: 'https://example.com/b', title: '' } },
        ],
      },
      ...extra,
    },
  ],
});

const validPayload = { items: ALL_STEPS.map((s) => item(s)), tips: ['保湿を丁寧に'] };

const memoryStorage = (): KeyValueStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => {
      data.set(k, v);
    },
  };
};

const okFetch = (body: unknown) =>
  jest.fn(async () => ({ ok: true, status: 200, json: async () => body }) as unknown as Response);

describe('request settings for stable answers', () => {
  it('uses greedy, seeded generation', () => {
    expect(GENERATION_CONFIG).toMatchObject({ temperature: 0, topK: 1, candidateCount: 1 });
    expect(typeof GENERATION_CONFIG.seed).toBe('number');
  });

  it('grounds answers with Google Search so products are real', () => {
    expect(buildRequestBody(profile).tools).toEqual([{ google_search: {} }]);
  });

  it('can skip Google Search to save quota', () => {
    expect(buildRequestBody(profile, { grounding: false })).not.toHaveProperty('tools');
  });

  it('builds the same prompt regardless of concern order', () => {
    const reversed = { ...profile, concerns: [...profile.concerns].reverse() };
    expect(buildPrompt(reversed)).toBe(buildPrompt(profile));
  });

  it('puts every condition and the budget limit into the prompt', () => {
    const prompt = buildPrompt(profile);
    for (const word of ['女性', '30代', '乾燥肌', 'シワ・たるみ', 'インナードライ', '4,000円以下']) {
      expect(prompt).toContain(word);
    }
  });
});

describe('profileKey', () => {
  it('ignores concern order and duplicates', () => {
    expect(profileKey({ ...profile, concerns: ['dehydration', 'wrinkles', 'wrinkles'] })).toBe(profileKey(profile));
  });

  it('differs when any condition differs', () => {
    expect(profileKey({ ...profile, budget: 'low' })).not.toBe(profileKey(profile));
  });
});

describe('extractJson', () => {
  it('reads JSON wrapped in a code block', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('rejects text without JSON', () => {
    expect(() => extractJson('すみません')).toThrow('JSON');
  });
});

describe('parseGeminiResponse', () => {
  it('returns five steps in routine order with deduplicated sources', () => {
    const shuffled = { ...validPayload, items: [...validPayload.items].reverse() };
    const result = parseGeminiResponse(geminiResponse(shuffled), profile);
    expect(result.items.map((i) => i.step)).toEqual(ALL_STEPS);
    expect(result.totalPrice).toBe(1650 * 5);
    expect(result.source).toBe('gemini');
    expect(result.sources).toEqual([
      { uri: 'https://example.com/a', title: '商品A' },
      { uri: 'https://example.com/b', title: 'https://example.com/b' },
    ]);
  });

  it('ignores thought parts', () => {
    const res = geminiResponse(validPayload);
    res.candidates[0].content.parts.unshift({ text: '考え中 {', thought: true } as never);
    expect(parseGeminiResponse(res, profile).items).toHaveLength(5);
  });

  it('flags products over the budget', () => {
    const payload = { ...validPayload, items: [item('cleanser', 5000), ...ALL_STEPS.slice(1).map((s) => item(s))] };
    const result = parseGeminiResponse(geminiResponse(payload), profile);
    expect(result.items[0].overBudget).toBe(true);
    expect(result.items[1].overBudget).toBe(false);
  });

  it('treats an unknown price as 0 without flagging it', () => {
    const payload = { ...validPayload, items: [item('cleanser', null), ...ALL_STEPS.slice(1).map((s) => item(s))] };
    const result = parseGeminiResponse(geminiResponse(payload), profile);
    expect(result.items[0].product.price).toBe(0);
    expect(result.items[0].overBudget).toBe(false);
  });

  it('fails when a step is missing', () => {
    const payload = { ...validPayload, items: validPayload.items.slice(0, 4) };
    expect(() => parseGeminiResponse(geminiResponse(payload), profile)).toThrow('日焼け止め');
  });

  it('skips items without a brand or name', () => {
    const payload = { ...validPayload, items: [{ ...item('cleanser'), brand: '' }, ...validPayload.items.slice(1)] };
    expect(() => parseGeminiResponse(geminiResponse(payload), profile)).toThrow('洗顔');
  });

  it('fails when the prompt is blocked', () => {
    expect(() => parseGeminiResponse({ promptFeedback: { blockReason: 'SAFETY' } }, profile)).toThrow('SAFETY');
  });
});

describe('getRecommendation', () => {
  it('uses the local catalog when no API key is set', async () => {
    const fetchImpl = okFetch({});
    const result = await getRecommendation(profile, { storage: memoryStorage(), fetchImpl });
    expect(result.source).toBe('local');
    expect(result.notice).toContain('APIキーが読み込まれていません');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('calls Gemini once and returns the identical answer for the same conditions', async () => {
    const storage = memoryStorage();
    const fetchImpl = okFetch(geminiResponse(validPayload));
    const first = await getRecommendation(profile, { apiKey: 'k', storage, fetchImpl });
    const reordered = { ...profile, concerns: [...profile.concerns].reverse() };
    const second = await getRecommendation(reordered, { apiKey: 'k', storage, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('sends the API key in a header, not the URL', async () => {
    const fetchImpl = okFetch(geminiResponse(validPayload));
    await getRecommendation(profile, { apiKey: 'secret', model: 'm', storage: memoryStorage(), fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/m:generateContent');
    expect(url).not.toContain('secret');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('secret');
  });

  it('falls back to the local catalog with a notice on HTTP errors, and does not cache it', async () => {
    const storage = memoryStorage();
    const fetchImpl = jest.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }) as unknown as Response);
    const result = await getRecommendation(profile, { apiKey: 'k', storage, fetchImpl });
    expect(result.source).toBe('local');
    expect(result.notice).toContain('HTTP 429');
    expect(storage.data.size).toBe(0);
  });

  it('shows the reason Google gives for an HTTP error', async () => {
    const fetchImpl = jest.fn(
      async () =>
        ({
          ok: false,
          status: 400,
          json: async () => ({ error: { message: 'API key not valid. Please pass a valid API key.' } }),
        }) as unknown as Response,
    );
    const result = await getRecommendation(profile, { apiKey: 'bad', storage: memoryStorage(), fetchImpl });
    expect(result.notice).toContain('HTTP 400: API key not valid');
  });

  it('falls back when the network fails', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    const result = await getRecommendation(profile, { apiKey: 'k', storage: memoryStorage(), fetchImpl });
    expect(result.notice).toContain('接続できませんでした');
  });

  it('falls back when the answer is malformed', async () => {
    const result = await getRecommendation(profile, {
      apiKey: 'k',
      storage: memoryStorage(),
      fetchImpl: okFetch(geminiResponse('ごめんなさい')),
    });
    expect(result.source).toBe('local');
    expect(result.notice).toContain('JSON');
  });

  it('uses mock answers without calling the API or caching them', async () => {
    const storage = memoryStorage();
    const fetchImpl = okFetch({});
    const result = await getRecommendation(profile, { storage, fetchImpl, mock: true });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.source).toBe('gemini');
    expect(result.items).toHaveLength(5);
    expect(result.items[0].product.brand).toContain('テスト');
    expect(result.notice).toContain('テスト用モード');
    expect(storage.data.size).toBe(0);
  });

  it('keeps search and no-search answers in separate caches', async () => {
    const storage = memoryStorage();
    const fetchImpl = okFetch(geminiResponse(validPayload));
    await getRecommendation(profile, { apiKey: 'k', storage, fetchImpl });
    await getRecommendation(profile, { apiKey: 'k', storage, fetchImpl, grounding: false });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const body = JSON.parse((fetchImpl.mock.calls[1] as unknown as [string, RequestInit])[1].body as string);
    expect(body.tools).toBeUndefined();
  });
});

describe('describeHttpError', () => {
  it('explains rate limits with the wait time Google suggests', () => {
    const body = {
      error: {
        message: 'Resource has been exhausted',
        details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '16.5s' }],
      },
    };
    expect(describeHttpError(429, body)).toBe('Gemini APIの利用上限に達しました（HTTP 429・約17秒後に再試行できます）');
  });

  it('explains rate limits without a wait time', () => {
    expect(describeHttpError(429, null)).toContain('しばらく待ってから');
  });

  it('includes the message for other errors', () => {
    expect(describeHttpError(404, { error: { message: 'model not found' } })).toBe(
      'Gemini APIエラー（HTTP 404: model not found）',
    );
  });
});
