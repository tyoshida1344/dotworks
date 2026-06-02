<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { S } from '../core/state.js'
import { ui } from '../core/ui.js'
import { initContexts, resize, drawPx, drawGrid, drawHover, drawFillPreview, zoomCanvas, drawBg } from '../core/canvas.js'
import { applyDraw, floodFill, getFillArea, bres, idx, inB, setPx } from '../core/tools.js'
import { saveUndo } from '../core/history.js'

const bgcvEl   = ref(null)
const cvEl     = ref(null)
const gridcvEl = ref(null)
const cwrapEl  = ref(null)

// ドラッグ中の一時状態（アンドゥ履歴・reactive S には含めない）
let painting   = false
let strokeTool = null  // このストロークで使うツール（押したボタンで決まる）
let lastCell   = null
let lineStart  = null
let lineSnap   = null   // 直線ドラッグ開始時のスナップショット

function cellAt(e) {
  const r = gridcvEl.value.getBoundingClientRect()
  return [
    Math.floor((e.clientX - r.left) / S.cell),
    Math.floor((e.clientY - r.top)  / S.cell),
  ]
}

function onMousedown(e) {
  // 左(0)＝toolL、右(2)＝toolR。それ以外と多重押しは無視
  if (e.button !== 0 && e.button !== 2) return
  if (painting) return
  const tool = e.button === 2 ? S.toolR : S.toolL
  strokeTool = tool
  painting = true
  const [x, y] = cellAt(e)

  if (tool === 'picker') {
    const c = S.pixels[idx(x, y)]
    if (c) S.color = c
    painting = false; return
  }
  if (tool === 'bucket') {
    saveUndo(); floodFill(x, y, S.color); drawPx()
    painting = false; return
  }
  if (tool === 'line') {
    lineStart = [x, y]; lineSnap = [...S.pixels]; return
  }

  saveUndo()
  applyDraw(x, y, tool)
  lastCell = [x, y]
  drawPx()
}

function onMousemove(e) {
  const [x, y] = cellAt(e)
  const inside = inB(x, y)

  if (!painting) {
    ui.hoverPos   = inside ? [x, y] : null
    ui.hoverColor = inside ? (S.pixels[idx(x, y)] ?? null) : null
    // ホバー時のプレビューは左ボタン（主操作）のツールを基準にする
    if (S.toolL === 'bucket' && inside) {
      drawFillPreview(getFillArea(x, y), x, y)
    } else {
      drawHover(inside ? x : null, inside ? y : null)
    }
    return
  }

  if (strokeTool === 'line' && lineStart) {
    S.pixels = [...lineSnap]
    bres(lineStart[0], lineStart[1], x, y).forEach(([px, py]) => setPx(px, py, S.color))
    drawPx()
  } else {
    if (lastCell) {
      const [lx, ly] = lastCell
      if (lx !== x || ly !== y) {
        bres(lx, ly, x, y).slice(1).forEach(([px, py]) => applyDraw(px, py, strokeTool))
      }
    } else {
      applyDraw(x, y, strokeTool)
    }
    lastCell = [x, y]
    drawPx()
  }

  // 描画後に色を取得することで、塗った直後の色を正確に反映する
  ui.hoverPos   = inside ? [x, y] : null
  ui.hoverColor = inside ? (S.pixels[idx(x, y)] ?? null) : null
  drawHover(inside ? x : null, inside ? y : null)
}

function onMouseleave() {
  ui.hoverPos   = null
  ui.hoverColor = null
  drawHover(null, null)
}

// ホイールで拡大倍率を変更（上＝拡大 / 下＝縮小）
function onWheel(e) {
  zoomCanvas(e.deltaY < 0 ? 4 : -4)
  // ズーム後もカーソル位置のホバー表示を更新（セルサイズが変わるため再計算）
  const [x, y] = cellAt(e)
  const inside = inB(x, y)
  ui.hoverPos   = inside ? [x, y] : null
  ui.hoverColor = inside ? (S.pixels[idx(x, y)] ?? null) : null
  drawHover(inside ? x : null, inside ? y : null)
}

function onWindowMouseup(e) {
  if (!painting) return

  if (strokeTool === 'line' && lineStart) {
    const [x, y] = cellAt(e)
    S.pixels = [...lineSnap]
    // 終点がキャンバス外なら線は確定せず、スナップショットに戻して破棄する
    if (inB(x, y)) {
      saveUndo()
      bres(lineStart[0], lineStart[1], x, y).forEach(([px, py]) => setPx(px, py, S.color))
    }
    lineStart = null; lineSnap = null
    drawPx()
  }

  painting = false; lastCell = null; strokeTool = null
}

// canvas の見た目に影響する状態を watch
// 補助線系は drawHover 経由（内部で drawGrid を呼ぶ）でホバー枠を維持する
watch(() => S.overlay,   drawPx)
watch(() => S.refImg,    drawPx)
watch(() => S.bg,        drawBg)
watch(() => S.headUnits, () => drawHover(ui.hoverPos?.[0] ?? null, ui.hoverPos?.[1] ?? null))
watch(() => S.vDivUnits, () => drawHover(ui.hoverPos?.[0] ?? null, ui.hoverPos?.[1] ?? null))

onMounted(() => {
  initContexts(bgcvEl.value, cvEl.value, gridcvEl.value, cwrapEl.value)
  resize()
  window.addEventListener('mouseup', onWindowMouseup)
})
onUnmounted(() => {
  window.removeEventListener('mouseup', onWindowMouseup)
})
</script>

<template>
  <div id="carea">
    <div ref="cwrapEl" id="cwrap">
      <canvas ref="bgcvEl"   id="bgcv"></canvas>
      <canvas ref="cvEl"     id="cv"></canvas>
      <canvas ref="gridcvEl" id="gridcv"
        @mousedown="onMousedown"
        @mousemove="onMousemove"
        @mouseleave="onMouseleave"
        @wheel.prevent="onWheel"
        @contextmenu.prevent
      ></canvas>
    </div>
  </div>
</template>
