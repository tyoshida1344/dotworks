# DOTWORKS

初心者でも"レベルの高いドット絵"が作れるピクセルアートエディタ。

陰影・縁取り・ディザリングといった「玄人の技」をツール側が自動化することで、デザイン未経験のゲーム開発者でも清潔で読みやすいスプライトを作れるようにするのがコンセプト。

## 機能

| 機能 | 詳細 |
|---|---|
| **描画ツール** | ペン / 消しゴム / 直線 / 塗りつぶし / スポイト / ディザ |
| **左右対称** | 反対側に同じドットを自動描画 |
| **シャドウランプ** | ベース色から明暗5段を自動生成（影は寒色・光は暖色にシフト） |
| **パレット** | PICO-8 / Sweetie16 / グレースケール / 参照画像から抽出 |
| **Auto Outline** | シルエット外周を1ドットで自動縁取り |
| **ディザリング** | 市松模様で2色の中間調を表現 |
| **補助線** | 頭身ガイド / 中心線 / カスタム横縦線（書き出し非対象） |
| **参照画像** | 読み込み・オーバーレイ表示・パレット抽出 |
| **Undo / Redo** | 60手まで |
| **PNG 書き出し** | 16倍スケール・背景透過 |

## セットアップ

Node.js 18 以上が必要です。

```bash
git clone <リポジトリURL>
cd dot-editor
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

## コマンド

```bash
npm run dev            # 開発サーバー起動（HMR あり）
npm run build          # プロダクションビルド → dist/
npm run preview        # ビルド結果の確認
npm run deploy         # ビルド → Netlify 本番へデプロイ
npm run deploy:preview # ビルド → Netlify 下書きプレビューURLを生成
```

## デプロイ（Netlify）

[Netlify](https://www.netlify.com/) でホストしています。`netlify-cli` を使い、ローカルから一発でビルド＆デプロイできます。

### 初回だけの準備

Netlify アカウントでの認証と、このフォルダと既存サイトの紐付けが必要です（対話・ブラウザ認証）。

```bash
npx netlify login   # ブラウザが開いて認証
npx netlify link    # このフォルダを既存の Netlify サイトに紐付け
```

紐付け情報は `.netlify/`（gitignore 済み）に保存されます。

### デプロイ

```bash
npm run deploy          # ビルド → 本番URLへ反映
npm run deploy:preview  # ビルド → 下書きプレビューURLを生成（本番は変えない）
```

`npm run deploy` は内部で `vite build && netlify deploy --prod --dir=dist` を実行します。ビルド設定（コマンド・公開ディレクトリ）は `netlify.toml` に定義しています。

## キーボードショートカット

| キー | 操作 |
|---|---|
| `B` | ペン |
| `E` | 消しゴム |
| `L` | 直線 |
| `G` | 塗りつぶし |
| `I` | スポイト |
| `D` | ディザ |
| `S` | 左右対称トグル |
| `Ctrl` + `Z` | Undo |
| `Ctrl` + `Y` | Redo |

## 技術スタック

- [Vite](https://vitejs.dev/) — ビルドツール
- [Vue 3](https://vuejs.org/) — UI フレームワーク（Composition API）
- Canvas API — 3層構成でピクセル描画

## 開発体制

このプロジェクトは **AI 駆動開発** で実装しています。コードの記述・修正・リファクタリングは原則として AI（[Claude Code](https://claude.com/claude-code)）が担い、**人の手はソースコードに直接入れない**運用です。人間は要件定義・方針判断・レビューに徹し、実装そのものは AI に委ねています。

そのため、コミット履歴やコードの構成は AI による実装を前提としています。

## ライセンス

MIT
