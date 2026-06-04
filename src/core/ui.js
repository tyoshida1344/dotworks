import { reactive } from 'vue'

// キャンバス描画やアンドゥ履歴に含める必要がない UI 固有の状態
export const ui = reactive({
  hoverPos:   null,    // [x, y] | null
  hoverColor: null,    // hex | null（ホバー中のマスの色。透明なら null）
  guidePageOpen: false,
  cropOpen: false,     // 画像→ドット変換のクロップオーバーレイ表示
  panelOpen: false,    // スマホ：サイドバー（パネル）ドロワーの開閉
  palKey: 'pico8',     // パレットドロップダウンの選択値
})
