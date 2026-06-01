<script setup>
import { S } from '../../core/state.js'
import SidePanel from '../SidePanel.vue'

function onHDivInput(e) { S.headUnits = parseInt(e.target.value) }
function onVDivInput(e) { S.vDivUnits = parseInt(e.target.value) }
</script>

<template>
  <SidePanel title="GUIDES" tooltip="補助線は表示専用です。書き出し PNG には含まれません。">
    <div class="srow">
      <span class="slbl">横分割</span>
      <input type="range" min="0" max="8" step="1" :value="S.headUnits" @input="onHDivInput">
      <span class="sval">{{ S.headUnits === 0 ? 'off' : S.headUnits }}</span>
    </div>
    <div class="srow">
      <span class="slbl">縦分割</span>
      <input type="range" min="0" max="8" step="1" :value="S.vDivUnits" @input="onVDivInput">
      <span class="sval">{{ S.vDivUnits === 0 ? 'off' : S.vDivUnits }}</span>
    </div>
  </SidePanel>
</template>
