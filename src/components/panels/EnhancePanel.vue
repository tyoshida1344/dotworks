<script setup>
import { S } from '../../core/state.js'
import { drawPx } from '../../core/canvas.js'
import { autoOutline, removeOutline } from '../../core/tools.js'
import SidePanel from '../SidePanel.vue'

function onAutoOutline() { autoOutline(); drawPx() }
function onRemoveOutline() { removeOutline(); drawPx() }
</script>

<template>
  <SidePanel title="ENHANCE" tooltip="Auto Outline はスプライトのシルエット外側を1ドットで囲む。ゲームスプライトを背景に映えさせる定番テクニック。">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <span style="color:var(--muted);font-size:10px">縁取り色</span>
      <input type="color" class="out-col" v-model="S.outlineColor">
    </div>
    <button class="abtn" @click="onAutoOutline">⬛ Auto Outline</button>
    <button class="abtn" style="color:var(--muted)" @click="onRemoveOutline">✕ Remove Outline</button>
  </SidePanel>
</template>
