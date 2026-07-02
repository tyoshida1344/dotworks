import { reactive } from 'vue'
import { PAL } from './palette.js'

const SIZE_KEY = 'dotwork.canvasSize'
const SIZES = [16, 24, 32, 48]   // SIZE セレクトの選択肢と一致させる

// 前回選択したキャンバスサイズを localStorage から復元（未保存・無効値なら 16）
function loadDefaultSize() {
  try {
    const n = parseInt(localStorage.getItem(SIZE_KEY), 10)
    if (SIZES.includes(n)) return n
  } catch { /* localStorage 不可（プライベートモード等）は既定値へ */ }
  return 16
}

// サイズ変更時に既定値として保存する（resetCanvas から呼ばれる）
export function saveDefaultSize(n) {
  try { localStorage.setItem(SIZE_KEY, String(n)) } catch { /* 保存不可は無視 */ }
}

const SIZE = loadDefaultSize()   // デフォルトのキャンバス一辺（cols = rows）

export const S = reactive({
  cols: SIZE,
  rows: SIZE,
  cell: 16,
  pixels: new Array(SIZE * SIZE).fill(null),
  toolL: 'pencil',   // 左クリックで使うツール
  toolR: 'picker',   // 右クリックで使うツール
  color: '#f0a030',
  sym: false,
  palette: [...PAL.pico8],
  headUnits: 0,
  vDivUnits: 0,
  refImg: null,
  overlay: 0.30,
  bg: null,            // キャンバス背景色（null = 透過チェッカー）。表示のみ・書き出し非対象
  outlineColor: '#000000',
})
// アンドゥ履歴は history.js でモジュールレベルの素の配列として保持する
// （reactive(S) 下に大量のピクセルスナップショットを置く無駄を避けるため）
