# SkinLog

肌状態を管理し、最適なスキンケア用品を提案する React Native (Expo) アプリです。

## 機能

- **肌診断**：性別・年齢・予算・肌質・肌悩みを選ぶと、洗顔 → 化粧水 → 美容液 → 保湿 → 日焼け止めの5ステップで最適な商品を提案
  - 各商品に「おすすめ理由」（例：脂性肌向け／ニキビ・毛穴にアプローチ）と主な成分を表示
  - 敏感肌には刺激の強い成分（レチノール・サリチル酸など）を除外、10代にはレチノールを除外
  - 予算内に該当商品がない場合は最も手頃な商品を「予算超過」として表示
  - 肌質・悩みに応じたワンポイントアドバイス
- **履歴**：診断結果を端末に保存（AsyncStorage）し、肌状態の推移を振り返り可能

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
  screens/ProfileFormScreen.tsx 条件入力画面
  screens/HistoryScreen.tsx     履歴画面
  components/                   共通UI
  storage/history.ts            履歴の永続化
```

## レコメンドの仕組み

予算（1品あたりの上限）と「避けるべき肌質・年代」で候補を絞り込んだ後、以下のスコアで各ステップの最上位を選びます（同点なら安い方）。

| 条件 | 加点 |
| --- | --- |
| 肌質が合う | +3 |
| 肌悩みに対応（1つごと） | +2 |
| 対象年代 | +1 |
| 性別ターゲット一致 / 不一致 | +1 / −2 |

> `src/data/products.ts` の商品名・価格は架空のサンプルです。実運用では商品DBやAPIに差し替えてください。
