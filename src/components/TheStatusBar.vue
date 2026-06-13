<script setup>
import { S } from '../core/state.js'
import { ui } from '../core/ui.js'
import { zoomCanvas } from '../core/canvas.js'

const TOOL_NAMES = {
  pencil: 'ペン', eraser: '消しゴム', line: '直線',
  bucket: '塗りつぶし', picker: 'スポイト', dither: 'ディザ',
}
</script>

<template>
  <div id="status">
    <span style="min-width:60px">
      {{ ui.hoverPos ? `${ui.hoverPos[0]}, ${ui.hoverPos[1]}` : '–, –' }}
    </span>
    <span style="display:flex;align-items:center;gap:5px;min-width:110px">
      <span
        style="width:14px;height:14px;border-radius:2px;border:1px solid var(--border);flex-shrink:0"
        :style="ui.hoverColor
          ? { background: ui.hoverColor }
          : { background: 'repeating-linear-gradient(45deg,#444 0,#444 3px,#222 3px,#222 6px)' }"
      ></span>
      <span :style="{ color: ui.hoverColor ? 'var(--text)' : 'var(--muted)' }">
        {{ ui.hoverColor ?? '透明' }}
      </span>
    </span>
    <span style="min-width:170px">
      <span style="color:var(--amber)">L</span> {{ TOOL_NAMES[S.toolL] ?? S.toolL }}
      <span class="rtool"><span style="color:var(--teal);margin-left:8px">R</span> {{ TOOL_NAMES[S.toolR] ?? S.toolR }}</span>
    </span>
    <div class="zctrl">
      <button @click="zoomCanvas(-4)">−</button>
      <span style="min-width:30px;text-align:center">{{ S.cell }}px</span>
      <button @click="zoomCanvas(+4)">+</button>
    </div>
  </div>
</template>
