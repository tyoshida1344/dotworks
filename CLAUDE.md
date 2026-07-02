# CLAUDE.md

このファイルは、リポジトリ内のコードを扱う Claude Code (claude.ai/code) への案内です。

## コマンド

ローカル開発・利用は `README.md`、本番運用（Netlify デプロイ・Supabase 本番・マイグレーション適用）は `OPERATIONS.md`、マイグレーションの作法は `supabase/migrations/README.md`。
変更後の検証は `npm run build`（このリポジトリにテスト／Lint の設定は無い）。

## プロジェクト概要

**DOTWORK** — 初心者向けのドット絵エディタ。設計思想は「選択肢を絞り、陰影・縁取り・ディザリングを自動化する」こと（実装判断の前提。製品紹介・機能一覧は `README.md`）。技術スタックは **Vite + Vue 3（Composition API / `<script setup>`）** ＋ Vanilla JS コアモジュール。

## ファイル構成

置き場所の地図のみ。各ファイルの責務はアーキテクチャ節とソースを参照。

```
src/
  main.js / App.vue / router.js  ← エントリ、<router-view>、ルート定義（/ と /admin＋子ルート、/admin は遅延ロード・直リンクのみ）
  style.css                      ← グローバル CSS（:root に CSS 変数）
  core/        ← 状態とロジック（Vanilla JS）: state / palette / canvas / tools / history / export / ui
                 ＋ レッスン管理まわり: lessons / supabase / lessonsApi
  views/       ← EditorView（エディタ本体）/ AdminView（/admin のシェル: 認証＋ヘッダー）
                 ＋ AdminHome（管理トップのメニュー）/ LessonAdmin（レッスン管理）
  components/  ← The*（Header/Toolbar/Canvas/Sidebar/StatusBar）、SidePanel、各オーバーレイ（Guide/Lesson/ImageImport）
    panels/    ← サイドバーの各パネル（Color / Palette / Enhance / Guides / Background / RefImage）
    admin/     ← AdminLogin / LessonForm
supabase/migrations/  ← DB マイグレーション（スキーマ・RLS・バケット・RPC・管理者アカウント admins/admin_sessions／既定レッスンのシード）
supabase/functions/   ← Edge Function（admin: 管理者認証・レッスン/お題画像の書き込み。service_role）
.env.example         ← Supabase 接続情報テンプレート
```

## アーキテクチャ

### 状態管理（state.js）

`S = reactive({...})` がアプリ唯一の状態ソース。Vue の Proxy ベース reactivity で動作するため、`S.pixels[i] = color` 等のインデックス代入もトラッキングされる。ただしピクセル配列の変更を watch することはパフォーマンス上避けており、代わりにツール関数が直接 `drawPx()` を呼ぶ。

キャンバスの初期サイズは **16×16**。サイズを変更すると `resetCanvas()` が `saveDefaultSize()` で localStorage（キー `dotwork.canvasSize`）に保存し、次回起動時の既定値として復元する。`SIZES` 配列は `TheHeader` の SIZE セレクト選択肢と一致させること。

`ui.js` は `hoverPos`（カーソル位置）・`guidePageOpen`（ガイドページ表示）・`cropOpen`（画像→ドット変換のクロップ表示）・`lessonPageOpen`（レッスン選択表示）など、アンドゥ履歴に含める必要のない揮発性状態を持つ。これらは `S` から分離してある。

### ルーティングとレッスン管理（router.js / lessons.js / lessonsApi.js / supabase.js）

`vue-router`（history モード）。`/` = `EditorView`（エディタ本体）。`/admin` = `AdminView`（遅延ロード）で、これは **DOTWORK ADMIN の「シェル」**（Supabase 設定チェック・ログイン・共通ヘッダー・ログアウト）。管理機能そのものは子ルートに分離する: `/admin`（index）= `AdminHome`（管理トップのメニュー）、`/admin/lessons` = `LessonAdmin`（レッスン管理）。今後の管理機能は子ルート＋`AdminHome` のメニュー項目として足す。`/admin` は UI 上の導線を置かず**直リンクのみ**で到達し、エディタへ戻る導線も持たない。`App.vue` は `<router-view>` だけ。SPA フォールバックは `netlify.toml` の redirect で対応。

レッスンの正データは **Supabase**（`lessons` テーブル＋公開バケット `lesson-refs`）。`supabase.js` は env（`VITE_SUPABASE_*`）から anon クライアントを作り、未設定なら `null`。`lessonsApi.js` は、**読み取り**（`fetchLessons`）を anon で直接行い、**書き込み・お題画像・認証**は Edge Function `admin` 経由で行う。DB 列（`id`/`description`/`deleted_at`…）とフロントの形（`id`/`desc`…）を相互変換する。レッスンの削除は物理削除ではなく `deleted_at` を立てる**論理削除**で、一覧は `deleted_at is null` のみ取得する。

`lessons.js` の `LESSONS` は**リアクティブ配列**。`loadLessons()` が Supabase から取得して中身を差し替える（未設定・取得失敗時は空。バンドルのフォールバックは持たない）。このとき**お題画像（`ref`）が無いレッスンは未公開扱いで除外**する（学習者向けの `LESSONS` にだけ効くフィルタで、管理画面が使う `fetchLessons()` は全件返す＝画像を付ければ公開される）。`@supabase/supabase-js` をエディタ初期ロードのバンドルから外すため、`lessons.js` は `supabase`/`lessonsApi` を**動的 import** し、`LessonPage` を初めて開いた時に `ensureLessons()` で読み込む（`main.js` では先読みしない）。管理画面で更新したら `invalidateLessons()` を呼び、次にレッスン画面を開いた時に取り直す。

お題画像は公開バケットに**毎回ユニークなファイル名**で保存（CDN キャッシュ汚染・URL 列挙の回避）。アップロードは Edge Function が**署名付きアップロードURL**を発行してクライアントがそこへ直接送る。差し替え・削除時は旧画像を `deleteRefImage()`（Edge Function 経由）で掃除する。閲覧（公開読み）は anon 可、書き込みはクライアントから不可。

### 認証と管理者アカウント（Edge Function `admin`）

管理者は **Supabase Auth と切り離した独自アカウント**。`admins` テーブル（`login_id`＋bcrypt ハッシュの `password`）＋`admin_sessions`（トークンは sha256 ハッシュで保存）で認証する。ログイン・書き込み・お題画像は Edge Function `supabase/functions/admin`（**service_role**）が担い、クライアント（anon）は `x-admin-token` を送るだけ。RLS は `lessons`/バケットとも**書き込みをクライアントから禁止**し（service_role のみ）、読み取りは全員。これは学習者アカウント（Supabase Auth／将来 Google）を管理者と**完全分離**するため。管理者の作成・パス変更は DB 操作（Studio / SQL、`admin_hash_password()`）で行う。`admin` 関数は独自トークン認証のため `config.toml` で `verify_jwt = false`。

### 3層キャンバス（canvas.js）

`bgcv` → `cv` → `gridcv` の順に重なる（全て `position: absolute`）。`gridcv` が最前面でマウスイベントを受け取る。

- `bgcv`：背景レイヤー。`S.bg` が null なら透過チェッカー、色指定なら単色。表示専用で `exportPNG()` は参照しない。`S.bg` 変更時に `TheCanvas.vue` が watch して再描画
- `cv`：参照画像オーバーレイ（底面）＋ピクセルデータ（前面）
- `gridcv`：グリッド線・補助線（書き出し非対象）

コンテキスト（`bgX/pxX/gX`）はモジュールレベル変数に保持し、`TheCanvas.vue` の `onMounted` で `initContexts()` を呼んで初期化する。

### ツール操作フロー（tools.js / history.js）

```
マウスダウン（TheCanvas.vue）
  └─ tool = button===2 ? S.toolR : S.toolL  ← 押したボタンでツール決定
  └─ saveUndo()             ← ストローク開始前に1回だけ保存
  └─ applyDraw(x, y, tool)  ← 指定ツールを1セルに適用
  └─ drawPx()               ← 呼び出し元（TheCanvas.vue）が担う

history.js の undo/redo は S.pixels のみ操作し、描画は呼び出さない。
App.vue が「undo() 成功 → drawPx()」の順で呼ぶ。
```

### 左右クリックのツール（toolL / toolR）

ツールは `S.toolL`（左ボタン）と `S.toolR`（右ボタン）の2枠を持つ。ツールバーは左クリックで `toolL`、右クリック（`contextmenu`）で `toolR` を割り当て、L/R バッジで表示する。キャンバスはマウスダウン時に押したボタンで使用ツールを決め、ストローク中は `strokeTool`（TheCanvas のモジュール変数）に保持する。キーボードショートカット（B/E/L…）は `toolL` を切り替える。右クリックのコンテキストメニューはキャンバスとツールボタンで抑制している。

### 注意点

- **ディザ＋対称のパリティ修正**：ディザツールは元ピクセルの `(x+y)%2` のパリティを鏡像側にも使う。これにより中心軸をまたいで市松パターンがズレる問題を防ぐ。
- **直線ツールのプレビュー**：`lineSnap`（ドラッグ開始時スナップショット）を毎フレーム `S.pixels` に復元してから再描画。確定は `window` の `mouseup`。終点がキャンバス外の場合は線を確定せず、`lineSnap` に戻して破棄する。
- **watch の範囲**：`S.overlay`・`S.refImg`・`S.headUnits`・`S.vDivUnits` は `TheCanvas.vue` で watch して描画を更新する。ピクセル配列は deep watch せず、ツール関数から直接 `drawPx()` を呼ぶ。
- **ズーム倍率**：`S.cell` は `zoomCanvas()` が `ZOOM_LEVELS`（`2,4,6,8,12,16,24,32` px）を1段ずつ移動する。`±` ボタンとキャンバスのホイールから共用。8px 未満は縮小プレビュー域で、`drawGrid()` が毎セルのグリッド線を隠す（補助線は残す）。

## テーマ・フォント

- 白基調テーマ。`style.css` の `:root` ブロックで CSS 変数管理。
- 面の階層: `--bg` 薄グレー `#f3f4f6`（アプリ／キャンバス領域）＞ `--bg2` 白 `#ffffff`（ヘッダー・ツールバー・サイドバー・ステータス）＞ `--bg3` `#f9fafb`（ボタン・入力）。境界線 `--border` `#e5e7eb`、本文 `--text` `#374151`、補助 `--muted` `#6b7280`
- アクセント: アンバー `--amber` `#e08a1e`（鮮やかなアンバー）、副次: ティール `--teal` `#0d9488`。アクティブ表示の淡い塗りは `--amber-soft` / `--teal-soft`、アクセント塗りボタン上の文字は `--on-accent`（白）
- フォント: **Silkscreen**（見出し・ロゴ）＋ **DM Mono**（UI）、Google Fonts から読み込み
- 補助線の色: ティール `#0d9488`（横分割）、ピンク `#f06080`（縦分割）。グリッド線・ホバー枠は白背景向けに `rgba(0,0,0,…)` で描画（`canvas.js`）。透過チェッカーは薄グレー（`drawBg` / `.bg-checker` / ステータスバー）

## ロードマップ（未実装）

1. 任意サイズのキャンバス＋大キャンバス時のパン / スクロール（タッチのピンチズーム / 2本指パン含む）
2. フレーム単位のアニメーション＋オニオンスキン
3. アンドゥ粒度の統一（ペンのストローク単位 vs. 単発操作単位）
