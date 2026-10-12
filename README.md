# SkinLog

肌状態を管理し、最適なスキンケア用品を提案する React Native (Expo) アプリです。

## 機能

- **肌診断**：性別・年齢・予算・肌質・肌悩みを選ぶと、洗顔 → 化粧水 → 美容液 → 保湿 → 日焼け止めの5ステップで最適な商品を提案
  - 各商品に「おすすめ理由」（例：脂性肌向け／ニキビ・毛穴にアプローチ）と主な成分を表示
  - 敏感肌には刺激の強い成分（レチノール・サリチル酸など）を除外、10代にはレチノールを除外
  - 予算内に該当商品がない場合は最も手頃な商品を「予算超過」として表示
  - 肌質・悩みに応じたワンポイントアドバイス
- **履歴**：診断結果を端末に保存（AsyncStorage）し、肌状態の推移を振り返り可能

## Gemini で実在商品を提案する

`.env.example` を `.env` にコピーし、[Google AI Studio](https://aistudio.google.com/) で発行した API キーを設定します。

```bash
cp .env.example .env
# EXPO_PUBLIC_GEMINI_API_KEY=xxxx を記入して npm start
```

- **実在商品に絞る**：Google検索グラウンディングで販売を確認できた商品だけを挙げるよう指示し、参照したページを結果画面に表示します
- **回答の揺らぎをなくす**：
  1. temperature 0・topK 1・seed固定で、毎回同じ答えになりやすくする
  2. 条件（肌悩みの選択順は無視）ごとに結果を端末に保存し、同じ条件では保存済みの結果を返す → 同じ条件なら必ず同じ答え
  3. プロンプトやモデルを変えたときだけ作り直す（`PROMPT_VERSION` を上げる）
- APIキー未設定・通信エラー・回答の形式不正のときは、アプリ内のサンプル商品で提案します
- **利用上限（HTTP 429）対策**：
  - `EXPO_PUBLIC_GEMINI_MOCK=1` … APIを呼ばずにテスト用の回答を表示（画面・履歴の確認用）
  - `EXPO_PUBLIC_GEMINI_GROUNDING=off` … Google検索での裏付けをやめて検索の上限を節約（実在の確認は弱くなる）
  - `EXPO_PUBLIC_GEMINI_MODEL` … 上限の大きい軽量モデル（Flash-Lite系）に切り替え
  - 同じ条件の2回目以降は保存済みの結果を使うので、APIを消費しない
  - 設定を変えたら `npx expo start --clear` で起動し直す
- ⚠️ `EXPO_PUBLIC_` の値はアプリに埋め込まれ、誰でも取り出せます。一般公開する前に、APIキーをサーバー側に置く構成に変更してください

## 起動方法

```bash
npm install
npm start          # Expo Go アプリでQRコードを読み取る
npm run android    # Android
npm run ios        # iOS（macOS）
```

## 開発

```bash
npm test           # レコメンドロジックのユニットテスト
npm run typecheck  # 型チェック
```

## ディレクトリ構成

```
App.tsx                         ルート（診断／履歴タブ）
src/
  types.ts                      型定義
  constants/labels.ts           選択肢・ラベル・予算上限
  data/products.ts              商品カタログ（サンプル）
  logic/recommend.ts            レコメンドエンジン（スコアリング）
  logic/recommend.test.ts       テスト
  ai/gemini.ts                  Gemini API 呼び出し・回答の検証
  ai/cache.ts                   同じ条件の結果を保存（揺らぎ対策）
  ai/getRecommendation.ts       キャッシュ → Gemini → ローカルの順で提案
  config.ts                     APIキー・モデル設定
  screens/ProfileFormScreen.tsx 条件入力画面
  screens/HistoryScreen.tsx     履歴画面
  components/                   共通UI
  storage/history.ts            履歴の永続化
```

## ローカル（サンプル商品）のレコメンドの仕組み

予算（1品あたりの上限）と「避けるべき肌質・年代」で候補を絞り込んだ後、以下のスコアで各ステップの最上位を選びます（同点なら安い方）。

| 条件 | 加点 |
| --- | --- |
| 肌質が合う | +3 |
| 肌悩みに対応（1つごと） | +2 |
| 対象年代 | +1 |
| 性別ターゲット一致 / 不一致 | +1 / −2 |

> `src/data/products.ts` の商品名・価格は架空のサンプルです。実運用では商品DBやAPIに差し替えてください。
