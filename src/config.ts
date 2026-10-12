/**
 * Gemini の設定。プロジェクト直下の .env に書く（.env.example 参照）。
 * EXPO_PUBLIC_ の値はアプリ本体に埋め込まれ、誰でも取り出せる点に注意。
 * 公開する前に、APIキーをサーバー側に置く構成に切り替えること。
 */
export const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
export const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || undefined;
