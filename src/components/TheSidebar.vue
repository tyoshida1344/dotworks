<script setup>
import { ui } from '../core/ui.js'
import ColorPanel      from './panels/ColorPanel.vue'
import PalettePanel    from './panels/PalettePanel.vue'
import EnhancePanel    from './panels/EnhancePanel.vue'
import GuidesPanel     from './panels/GuidesPanel.vue'
import BackgroundPanel from './panels/BackgroundPanel.vue'
import RefImagePanel   from './panels/RefImagePanel.vue'
</script>

<template>
  <!-- スマホ：ドロワー表示時の背景。タップで閉じる（デスクトップでは CSS で非表示） -->
  <div v-if="ui.panelOpen" id="side-backdrop" @click="ui.panelOpen = false"></div>
  <div id="side" :class="{ 'side-open': ui.panelOpen }">
    <button id="side-close" class="mobile-only" @click="ui.panelOpen = false">✕ 閉じる</button>
    <ColorPanel />
    <PalettePanel />
    <EnhancePanel />
    <GuidesPanel />
    <BackgroundPanel />
    <RefImagePanel />
  </div>
</template>
