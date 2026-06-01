import { S } from './state.js'

// 描画の呼び出しは呼び出し元（TheCanvas.vue / App.vue）が担う
export function saveUndo() {
  S.undo.push([...S.pixels])
  if (S.undo.length > 60) S.undo.shift()
  S.redo = []
}

// pixels を復元して true を返す。呼び出し元が drawPx() を呼ぶこと
export function undo() {
  if (!S.undo.length) return false
  S.redo.push([...S.pixels])
  S.pixels = S.undo.pop()
  return true
}

export function redo() {
  if (!S.redo.length) return false
  S.undo.push([...S.pixels])
  S.pixels = S.redo.pop()
  return true
}

export function clearAll() {
  saveUndo()
  S.pixels = new Array(S.cols * S.rows).fill(null)
  // 呼び出し元が drawPx() を呼ぶこと
}
