<script setup>
import { S } from '../core/state.js'
import { ui } from '../core/ui.js'
import { resetCanvas, drawPx } from '../core/canvas.js'
import { clearAll } from '../core/history.js'
import { exportPNG } from '../core/export.js'
import { lessonState } from '../core/lessons.js'

const emit = defineEmits(['undo', 'redo'])

function onSizeChange(e) {
  const n = parseInt(e.target.value)
  if (!confirm(`${n}×${n} にリサイズしますか？現在の描画は消去されます。`)) {
    e.target.value = String(S.cols); return
  }
  resetCanvas(n)
}

function onClear() {
  if (!confirm('キャンバスを消去しますか？')) return
  clearAll()
  drawPx()
}
</script>

<template>
  <header id="hdr">
    <span id="logo">DOTWORK</span>
    <div class="vsep"></div>

    <div class="hgrp">
      <span class="hlbl">SIZE</span>
      <select
        :value="String(S.cols)"
        :disabled="!!lessonState.active"
        :title="lessonState.active ? 'レッスン中はサイズが固定されます' : ''"
        @change="onSizeChange"
      >
        <option value="16">16×16</option>
        <option value="24">24×24</option>
        <option value="32">32×32</option>
        <option value="48">48×48</option>
      </select>
    </div>

    <div class="vsep"></div>
    <div class="spc"></div>

    <div class="hgrp hgrp-actions">
      <button class="btn-t mobile-only" title="パネルを開く" @click="ui.panelOpen = true">☰ パネル</button>
      <button class="btn-t" @click="ui.lessonPageOpen = true">▦ レッスン</button>
      <button class="btn-t" @click="ui.guidePageOpen = true">? ガイド</button>
      <button title="Ctrl+Z" @click="emit('undo')">↩ Undo</button>
      <button title="Ctrl+Y" @click="emit('redo')">↪ Redo</button>
      <button class="btn-r" @click="onClear">✕ Clear</button>
      <button class="btn-a" @click="exportPNG">↓ Export PNG</button>
    </div>
  </header>
</template>
