import { S } from './state.js'
import { saveUndo } from './history.js'

export function idx(x, y) { return y * S.cols + x }
export function inB(x, y) { return x >= 0 && x < S.cols && y >= 0 && y < S.rows }

export function setPx(x, y, col) {
  if (!inB(x, y)) return
  S.pixels[idx(x, y)] = col
  if (S.sym) {
    const mx = S.cols - 1 - x
    if (mx !== x && inB(mx, y)) S.pixels[idx(mx, y)] = col
  }
}

export function bres(x0, y0, x1, y1) {
  const pts = []
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0)
  let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy
  for (;;) {
    pts.push([x0, y0])
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; x0 += sx }
    if (e2 <  dx) { err += dx; y0 += sy }
  }
  return pts
}

export function floodFill(x, y, newCol) {
  const target = S.pixels[idx(x, y)]
  if (target === newCol) return
  const stack = [[x, y]], seen = new Uint8Array(S.cols * S.rows)
  while (stack.length) {
    const [cx, cy] = stack.pop()
    if (!inB(cx, cy)) continue
    const i = idx(cx, cy)
    if (seen[i] || S.pixels[i] !== target) continue
    seen[i] = 1
    S.pixels[i] = newCol
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
  }
}

// 塗りつぶし対象のフラットインデックス一覧を返す（pixels は変更しない）
export function getFillArea(x, y) {
  if (!inB(x, y)) return []
  const target = S.pixels[idx(x, y)]
  const result = []
  const stack = [[x, y]], seen = new Uint8Array(S.cols * S.rows)
  while (stack.length) {
    const [cx, cy] = stack.pop()
    if (!inB(cx, cy)) continue
    const i = idx(cx, cy)
    if (seen[i] || S.pixels[i] !== target) continue
    seen[i] = 1
    result.push(i)
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
  }
  return result
}

// 1セルへのツール適用。drawPx() の呼び出しは呼び出し元が行う
export function applyDraw(x, y) {
  if (!inB(x, y)) return
  if (S.tool === 'pencil') { setPx(x, y, S.color); return }
  if (S.tool === 'eraser') { setPx(x, y, null);    return }
  if (S.tool === 'dither') {
    // 元ピクセルのパリティを鏡像側にも使うことで対称ディザのズレを防ぐ
    if ((x + y) % 2 === 0) {
      S.pixels[idx(x, y)] = S.color
      if (S.sym) {
        const mx = S.cols - 1 - x
        if (mx !== x && inB(mx, y)) S.pixels[idx(mx, y)] = S.color
      }
    }
    // 奇数セルは既存のピクセルをそのまま保持する（自然なブレンド効果）
  }
}

// 縁取り：シルエット外側1ドットを指定色で塗る
export function autoOutline() {
  saveUndo()
  const col = S.outlineColor
  const snap = [...S.pixels]
  const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
  for (let y = 0; y < S.rows; y++) {
    for (let x = 0; x < S.cols; x++) {
      if (snap[idx(x, y)]) continue
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy
        if (inB(nx, ny) && snap[idx(nx, ny)]) { S.pixels[idx(x, y)] = col; break }
      }
    }
  }
  // 呼び出し元が drawPx() を呼ぶこと
}

export function removeOutline() {
  saveUndo()
  const col = S.outlineColor
  for (let i = 0; i < S.pixels.length; i++) {
    if (S.pixels[i] === col) S.pixels[i] = null
  }
  // 呼び出し元が drawPx() を呼ぶこと
}
