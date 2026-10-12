/**
 * Gemini の設定。プロジェクト直下の .env に書く（.env.example 参照）。
 * EXPO_PUBLIC_ の値はアプリ本体に埋め込まれ、誰でも取り出せる点に注意。
 * 公開する前に、APIキーをサーバー側に置く構成に切り替えること。
 * 値を変えたら npx expo start --clear で起動し直す。
 */
export const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
export const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || undefined;
/** 1 にすると API を呼ばずにテスト用の回答を返す（利用上限を消費しない） */
export const GEMINI_MOCK = process.env.EXPO_PUBLIC_GEMINI_MOCK === '1';
/** off にすると Google検索での裏付けをやめる（検索の利用上限を消費しないが、実在の確認が弱くなる） */
export const GEMINI_GROUNDING = process.env.EXPO_PUBLIC_GEMINI_GROUNDING !== 'off';
