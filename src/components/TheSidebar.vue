<script setup>
import ColorPanel      from './panels/ColorPanel.vue'
import PalettePanel    from './panels/PalettePanel.vue'
import EnhancePanel    from './panels/EnhancePanel.vue'
import GuidesPanel     from './panels/GuidesPanel.vue'
import BackgroundPanel from './panels/BackgroundPanel.vue'
import RefImagePanel   from './panels/RefImagePanel.vue'
</script>

<template>
  <div id="side">
    <ColorPanel />
    <PalettePanel />
    <EnhancePanel />
    <GuidesPanel />
    <BackgroundPanel />
    <RefImagePanel />
  </div>
</template>
