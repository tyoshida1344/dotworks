<script setup>
import { onMounted, onUnmounted } from 'vue'
import { undo, redo } from '../core/history.js'
import { drawPx } from '../core/canvas.js'
import { S } from '../core/state.js'

import TheHeader    from '../components/TheHeader.vue'
import TheToolbar   from '../components/TheToolbar.vue'
import TheCanvas    from '../components/TheCanvas.vue'
import TheSidebar   from '../components/TheSidebar.vue'
import TheStatusBar from '../components/TheStatusBar.vue'
import GuidePage    from '../components/GuidePage.vue'
import ImageImportModal from '../components/ImageImportModal.vue'
import LessonPage    from '../components/LessonPage.vue'

const TOOL_KEYS = { B:'pencil', E:'eraser', L:'line', G:'bucket', I:'picker', D:'dither' }

function onKeydown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); if (undo()) drawPx() }
    if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); if (redo()) drawPx() }
    return
  }
  const k = e.key.toUpperCase()
  if (TOOL_KEYS[k]) S.toolL = TOOL_KEYS[k]   // キーは左ボタンのツールを切替
  if (k === 'S') S.sym = !S.sym
}

function handleUndo() { if (undo()) drawPx() }
function handleRedo() { if (redo()) drawPx() }

onMounted(()   => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div id="layout">
    <TheHeader
      @undo="handleUndo"
      @redo="handleRedo"
    />
    <TheToolbar />
    <TheCanvas />
    <TheSidebar />
    <TheStatusBar />
    <GuidePage />
    <ImageImportModal />
    <LessonPage />
  </div>
</template>
