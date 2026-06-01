import { S } from './state.js'

let bgX, pxX, gX, _bgEl, _cvEl, _gridEl, _wrapEl

export function initContexts(bgEl, cvEl, gridEl, wrapEl) {
  _bgEl = bgEl; _cvEl = cvEl; _gridEl = gridEl; _wrapEl = wrapEl
  bgX = bgEl.getContext('2d')
  pxX = cvEl.getContext('2d')
  gX  = gridEl.getContext('2d')
}

export function resize() {
  const w = S.cols * S.cell, h = S.rows * S.cell
  for (const el of [_bgEl, _cvEl, _gridEl]) {
    el.width = w; el.height = h
    el.style.width = w + 'px'; el.style.height = h + 'px'
  }
  _wrapEl.style.width = w + 'px'; _wrapEl.style.height = h + 'px'
  drawBg(); drawPx(); drawGrid()
}

// キャンバスサイズ変更（状態リセット込み）
export function resetCanvas(n) {
  S.cols = S.rows = n
  S.pixels = new Array(n * n).fill(null)
  S.undo = []; S.redo = []
  resize()
}

export function drawBg() {
  const c = S.cell
  for (let y = 0; y < S.rows; y++) {
    for (let x = 0; x < S.cols; x++) {
      bgX.fillStyle = (x + y) % 2 === 0 ? '#2e2e2e' : '#1e1e1e'
      bgX.fillRect(x * c, y * c, c, c)
    }
  }
}

export function drawPx() {
  pxX.clearRect(0, 0, _cvEl.width, _cvEl.height)
  if (S.refImg && S.overlay > 0) {
    pxX.globalAlpha = S.overlay
    pxX.drawImage(S.refImg, 0, 0, _cvEl.width, _cvEl.height)
    pxX.globalAlpha = 1
  }
  const c = S.cell
  for (let i = 0; i < S.pixels.length; i++) {
    if (!S.pixels[i]) continue
    pxX.fillStyle = S.pixels[i]
    pxX.fillRect((i % S.cols) * c, Math.floor(i / S.cols) * c, c, c)
  }
}

export function drawGrid() {
  const c = S.cell, cols = S.cols, rows = S.rows
  gX.clearRect(0, 0, _gridEl.width, _gridEl.height)

  // グリッド線
  gX.strokeStyle = 'rgba(255,255,255,0.07)'; gX.lineWidth = 1
  for (let x = 0; x <= cols; x++) {
    gX.beginPath(); gX.moveTo(x * c + .5, 0); gX.lineTo(x * c + .5, rows * c); gX.stroke()
  }
  for (let y = 0; y <= rows; y++) {
    gX.beginPath(); gX.moveTo(0, y * c + .5); gX.lineTo(cols * c, y * c + .5); gX.stroke()
  }

  // 頭身ガイド（ティール）
  if (S.headUnits > 0) {
    gX.strokeStyle = '#30c0a0'; gX.lineWidth = 1
    gX.font = '8px DM Mono, monospace'; gX.fillStyle = '#30c0a0'
    for (let i = 1; i < S.headUnits; i++) {
      const py = Math.round(rows * i / S.headUnits) * c + .5
      gX.beginPath(); gX.moveTo(0, py); gX.lineTo(cols * c, py); gX.stroke()
      gX.fillText(String(i), 3, py - 2)
    }
  }

  // 縦分割（ピンク）
  if (S.vDivUnits > 0) {
    gX.strokeStyle = '#f06080'; gX.lineWidth = 1
    gX.font = '8px DM Mono, monospace'; gX.fillStyle = '#f06080'
    for (let i = 1; i < S.vDivUnits; i++) {
      const px = Math.round(cols * i / S.vDivUnits) * c + .5
      gX.beginPath(); gX.moveTo(px, 0); gX.lineTo(px, rows * c); gX.stroke()
      gX.fillText(String(i), px + 3, 10)
    }
  }

}

// ホバーセルをグリッド層に重ねて描画。x/y が null なら枠だけ消してグリッドを戻す
export function drawHover(x, y) {
  drawGrid()
  if (x == null || y == null) return
  const c = S.cell
  // 薄い白オーバーレイ
  gX.fillStyle = 'rgba(255,255,255,0.13)'
  gX.fillRect(x * c, y * c, c, c)
  // 白枠（1px 内側）
  gX.strokeStyle = 'rgba(255,255,255,0.9)'
  gX.lineWidth = 1
  gX.strokeRect(x * c + 0.5, y * c + 0.5, c - 1, c - 1)
}

// バケツツール用：塗りつぶし範囲をアンバーでハイライト表示
export function drawFillPreview(indices, hx, hy) {
  drawGrid()
  if (!indices.length) return
  const c = S.cell

  // 塗りつぶし範囲をアンバーで塗る
  gX.fillStyle = 'rgba(240,160,48,0.28)'
  for (const i of indices) {
    gX.fillRect((i % S.cols) * c, Math.floor(i / S.cols) * c, c, c)
  }

  // 塗りつぶし範囲の輪郭だけ縁取る（隣が範囲外のエッジのみ線を引く）
  const inArea = new Uint8Array(S.cols * S.rows)
  for (const i of indices) inArea[i] = 1
  gX.strokeStyle = 'rgba(240,160,48,0.9)'
  gX.lineWidth = 1
  for (const i of indices) {
    const x = i % S.cols, y = Math.floor(i / S.cols)
    if (y === 0          || !inArea[i - S.cols]) { gX.beginPath(); gX.moveTo(x*c, y*c);     gX.lineTo((x+1)*c, y*c);     gX.stroke() }
    if (y === S.rows - 1 || !inArea[i + S.cols]) { gX.beginPath(); gX.moveTo(x*c, (y+1)*c); gX.lineTo((x+1)*c, (y+1)*c); gX.stroke() }
    if (x === 0          || !inArea[i - 1])      { gX.beginPath(); gX.moveTo(x*c, y*c);     gX.lineTo(x*c, (y+1)*c);     gX.stroke() }
    if (x === S.cols - 1 || !inArea[i + 1])      { gX.beginPath(); gX.moveTo((x+1)*c, y*c); gX.lineTo((x+1)*c, (y+1)*c); gX.stroke() }
  }

  // カーソル位置の白枠
  if (hx != null && hy != null) {
    gX.strokeStyle = 'rgba(255,255,255,0.9)'
    gX.lineWidth = 1
    gX.strokeRect(hx * c + 0.5, hy * c + 0.5, c - 1, c - 1)
  }
}
