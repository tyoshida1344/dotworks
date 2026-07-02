# DOTWORK

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
npm run dev      # 開発サーバー起動（HMR あり）
npm run build    # プロダクションビルド → dist/
npm run preview  # ビルド結果の確認
```

本番デプロイ・本番 DB へのマイグレーション適用は [OPERATIONS.md](OPERATIONS.md) を参照。

## レッスン管理（Supabase）

レッスン管理画面 `/admin` は、レッスンデータの保存に Supabase（DB / 認証 / ストレージ）を使います。ここでは**ローカルでの動かし方**を説明します。**本番セットアップ・本番へのマイグレーション適用・デプロイは [OPERATIONS.md](OPERATIONS.md)** を、設計・仕組みは [`CLAUDE.md`](CLAUDE.md) の「ルーティングとレッスン管理」を参照。

> Supabase 未設定でもエディタ（描画）は動作しますが、レッスンは取得できず一覧が空になります（`/admin` は「未設定」表示）。

### ローカル開発（Supabase CLI）

Docker 上に Postgres・Auth・Storage・Studio を立ち上げ、手元だけで動かせます。

**前提**: [Docker Desktop](https://www.docker.com/products/docker-desktop/)（起動しておく） / [Supabase CLI](https://supabase.com/docs/guides/local-development)（グローバル導入は不要。以下は `npx` 例。scoop / Homebrew でも可）

```bash
npx supabase init    # 初回のみ。supabase/config.toml を生成（対話で y/N を聞かれる）
npx supabase start   # Docker 上にローカルスタックを起動
```

起動後に表示される接続情報（後から `npx supabase status` でも確認可）:

| 項目 | 値 |
|---|---|
| API URL | `http://127.0.0.1:54321` |
| Studio（管理 UI） | `http://127.0.0.1:54323` |
| DB URL | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| anon key | 出力された `anon key` をコピー |

- **スキーマ適用**: `npx supabase db reset`（`supabase/migrations/` を古い順に適用し、シードも投入。ローカル DB は初期化される）。
- **Edge Function**: `npx supabase functions serve admin`（管理API＝ログイン・書き込み・お題画像を配信）。`http://localhost:5173/admin` を使う間はこれを起動しておく。
- **管理者アカウント**: Supabase Auth ではなく `admins` テーブルで管理。Studio → SQL Editor で作成:

  ```sql
  insert into public.admins (login_id, password)
  values ('admin', public.admin_hash_password('好きなパスワード'));
  ```

  これが `/admin` のログイン（ログインID＋パスワード）になる。パスワードは bcrypt でハッシュ保存される。
- **`.env`**: `VITE_SUPABASE_URL=http://127.0.0.1:54321` と、表示された anon key を `VITE_SUPABASE_ANON_KEY` に設定。
- **停止**: `npx supabase stop`（データ保持） / `npx supabase stop --no-backup`（ローカル DB も破棄）。
- **スキーマ変更**: 既存マイグレーションは編集せず**新しいマイグレーションを追加**する。作法は [`supabase/migrations/README.md`](supabase/migrations/README.md)、本番への適用は [OPERATIONS.md](OPERATIONS.md)。

### 利用メモ

- `npm run dev` で起動し、`http://localhost:5173/admin` にアクセス（UI 上の導線はなく直リンクのみ）。ログイン後にレッスンの新規作成・編集・削除・並び替えができる。
- お題画像は **PNG / SVG・2MB まで・任意**。アップロードすると公開バケットにユニークなファイル名で保存され、差し替え・削除時に旧画像は自動で掃除される。未設定のカードは「画像なし」表示になる。
- 既定 4 レッスンのお題画像は `src/assets/lessons/lv1/`・`lv2/` にあるので、初回はそれぞれ編集してアップロードする。
- 公開バケットのため、URL を知れば誰でも画像を閲覧可能（お題画像は元々公開前提）。

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
