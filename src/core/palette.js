export const PAL = {
  pico8: [
    '#000000','#1D2B53','#7E2553','#008751',
    '#AB5236','#5F574F','#C2C3C7','#FFF1E8',
    '#FF004D','#FFA300','#FFEC27','#00E436',
    '#29ADFF','#83769C','#FF77A8','#FFCCAA',
  ],
  sweetie: [
    '#1a1c2c','#5d275d','#b13e53','#ef7d57',
    '#ffcd75','#a7f070','#38b764','#257179',
    '#29366f','#3b5dc9','#41a6f6','#73eff7',
    '#f4f4f4','#94b0c2','#566c86','#333c57',
  ],
  gray: Array.from({ length: 16 }, (_, i) => {
    const v = Math.round(i * 17).toString(16).padStart(2, '0')
    return `#${v}${v}${v}`
  }),
}

export function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255
  let g = parseInt(hex.slice(3, 5), 16) / 255
  let b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h * 360, s * 100, l * 100]
}

export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r, g, b
  if      (h < 60)  { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else              { r = c; g = 0; b = x }
  const toHex = v => Math.round(Math.max(0, Math.min(255, (v + m) * 255))).toString(16).padStart(2, '0')
  return '#' + toHex(r) + toHex(g) + toHex(b)
}

export function generateLamp(hex) {
  const [h, s, l] = hexToHsl(hex)
  return [
    hslToHex(h - 22, s * 0.65, l * 0.38),
    hslToHex(h - 10, s * 0.82, l * 0.62),
    hex,
    hslToHex(h + 9,  Math.min(s, 80),       Math.min(l * 1.32, 86)),
    hslToHex(h + 20, Math.min(s * 0.85, 68), Math.min(l * 1.58, 93)),
  ]
}

export function extractPaletteFromImage(img) {
  const tmp = document.createElement('canvas')
  tmp.width = tmp.height = 64
  const tx = tmp.getContext('2d')
  tx.drawImage(img, 0, 0, 64, 64)
  const data = tx.getImageData(0, 0, 64, 64).data

  const freq = new Map()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const r = (data[i]     >> 3) << 3
    const g = (data[i + 1] >> 3) << 3
    const b = (data[i + 2] >> 3) << 3
    const key = (r << 16) | (g << 8) | b
    freq.set(key, (freq.get(key) || 0) + 1)
  }

  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1])
  const palette = []
  for (const [key] of sorted) {
    if (palette.length >= 16) break
    const r = (key >> 16) & 0xFF
    const g = (key >> 8)  & 0xFF
    const b = key         & 0xFF
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
    const tooClose = palette.some(p => {
      const pr = parseInt(p.slice(1, 3), 16)
      const pg = parseInt(p.slice(3, 5), 16)
      const pb = parseInt(p.slice(5, 7), 16)
      return Math.abs(pr - r) + Math.abs(pg - g) + Math.abs(pb - b) < 36
    })
    if (!tooClose) palette.push(hex)
  }
  while (palette.length < 16) palette.push('#000000')
  return palette
}
