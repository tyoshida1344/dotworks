# CLAUDE.md

このファイルは、リポジトリ内のコードを扱う Claude Code (claude.ai/code) への案内です。

## コマンド

```bash
npm run dev      # 開発サーバー起動 (Vite HMR)
npm run build    # プロダクションビルド → dist/
npm run preview  # ビルド結果のプレビュー
```

## プロジェクト概要

**DOTWORKS** — デザイン経験のないゲーム開発者向けのドット絵エディタ。選択肢を絞り、陰影・縁取り・ディザリングを自動化することで初心者でも完成度の高いスプライトを作れるようにする。

技術スタック: **Vite + Vue 3 (Composition API / `<script setup>`)** + Vanilla JS コアモジュール。

## ファイル構成

```
src/
  main.js          ← Vue アプリのエントリーポイント
  App.vue          ← ルートコンポーネント。キーボードショートカット管理
  style.css        ← グローバルスタイル（CSS 変数・全コンポーネント共通）
  core/
    state.js       ← reactive(S)：アプリの唯一の状態
    palette.js     ← PAL定数、hexToHsl/hslToHex、generateLamp、extractPaletteFromImage
    canvas.js      ← initContexts、resize、resetCanvas、drawBg/drawPx/drawGrid
    tools.js       ← idx、inB、setPx、bres、floodFill、applyDraw、autoOutline/removeOutline
    history.js     ← saveUndo、undo、redo、clearAll（描画呼び出しは含まない）
    export.js      ← exportPNG（16倍スケール・背景透過）
    ui.js          ← reactive({hoverPos, guidePageOpen})：UI固有の揮発性状態
  components/
    TheHeader.vue      ← ロゴ、サイズ選択、アクション群
    TheToolbar.vue     ← ツールボタン縦並び＋対称トグル
    TheCanvas.vue      ← 3層キャンバス、マウスイベント、canvas.js 初期化
    TheSidebar.vue     ← 各パネルのコンテナ
    TheStatusBar.vue   ← カーソル位置、ツール名、ズーム操作
    SidePanel.vue      ← 再利用可能なサイドバーセクション（title + tooltip + slot）
    GuidePage.vue      ← 全画面ガイドオーバーレイ（v-html + IntersectionObserver）
    panels/
      ColorPanel.vue     ← 現在色 + シャドウランプ（まとめてひとつのコンポーネント）
      PalettePanel.vue   ← パレット選択 + スウォッチグリッド
      EnhancePanel.vue   ← Auto Outline / Remove Outline
      GuidesPanel.vue    ← 頭身スライダー、中心線、カスタム補助線
      RefImagePanel.vue  ← 参照画像（ドロップゾーン・オーバーレイ・パレット抽出）
```

## アーキテクチャ

### 状態管理（state.js）

`S = reactive({...})` がアプリ唯一の状態ソース。Vue の Proxy ベース reactivity で動作するため、`S.pixels[i] = color` 等のインデックス代入もトラッキングされる。ただしピクセル配列の変更を watch することはパフォーマンス上避けており、代わりにツール関数が直接 `drawPx()` を呼ぶ。

`ui.js` は `hoverPos`（カーソル位置）と `guidePageOpen`（ガイドページ表示）だけを持つ。これらはアンドゥ履歴に含める必要がないため `S` から分離してある。

### 3層キャンバス（canvas.js）

`bgcv` → `cv` → `gridcv` の順に重なる（全て `position: absolute`）。`gridcv` が最前面でマウスイベントを受け取る。

- `bgcv`：透過チェッカー背景（静的、リサイズ時のみ再描画）
- `cv`：参照画像オーバーレイ（底面）＋ピクセルデータ（前面）
- `gridcv`：グリッド線・補助線（書き出し非対象）

コンテキスト（`bgX/pxX/gX`）はモジュールレベル変数に保持し、`TheCanvas.vue` の `onMounted` で `initContexts()` を呼んで初期化する。

### ツール操作フロー（tools.js / history.js）

```
マウスダウン（TheCanvas.vue）
  └─ saveUndo()          ← ストローク開始前に1回だけ保存
  └─ applyDraw(x, y)     ← 現在のツールを1セルに適用
  └─ drawPx()            ← 呼び出し元（TheCanvas.vue）が担う

history.js の undo/redo は S.pixels のみ操作し、描画は呼び出さない。
App.vue が「undo() 成功 → drawPx()」の順で呼ぶ。
```

### 注意点

- **ディザ＋対称のパリティ修正**：ディザツールは元ピクセルの `(x+y)%2` のパリティを鏡像側にも使う。これにより中心軸をまたいで市松パターンがズレる問題を防ぐ。
- **直線ツールのプレビュー**：`lineSnap`（ドラッグ開始時スナップショット）を毎フレーム `S.pixels` に復元してから再描画。確定は `window` の `mouseup`（キャンバス外でも確定できる）。
- **watch の範囲**：`S.overlay`・`S.refImg`・`S.headUnits`・`S.vDivUnits` は `TheCanvas.vue` で watch して描画を更新する。ピクセル配列は deep watch せず、ツール関数から直接 `drawPx()` を呼ぶ。

## テーマ・フォント

- 暖色ダークテーマ。`style.css` の `:root` ブロックで CSS 変数管理。
- アクセント: アンバー `#f0a030`、副次: ティール `#30a0a0`
- フォント: **Silkscreen**（見出し・ロゴ）＋ **DM Mono**（UI）、Google Fonts から読み込み
- 補助線の色: ティール `#30c0a0`（頭身）、ピンク `#f06080`（カスタム）、アンバー `#f0a030`（中心線）

## ロードマップ（未実装）

1. プロジェクトの保存・読み込み（JSON エクスポート / インポート）
2. 任意サイズのキャンバス＋大キャンバス時のパン / スクロール
3. フレーム単位のアニメーション＋オニオンスキン
4. モバイル / タッチ対応
5. アンドゥ粒度の統一（ペンのストローク単位 vs. 単発操作単位）
