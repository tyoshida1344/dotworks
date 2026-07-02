<script setup>
import { ref } from 'vue'
import { S } from '../../core/state.js'
import SidePanel from '../SidePanel.vue'

// プレビュー確認に使いやすい固定プリセット（白〜黒＋コントラスト確認用の有彩色）
const PRESETS = ['#ffffff', '#9aa0a6', '#000000', '#2a6cf0', '#e0407a', '#3fbf6f']

// ユーザーが追加したカスタム背景色は localStorage に永続保存する。
// （選択中の色 S.bg 自体は保存せず、リロード時は透過チェッカーに戻る）
const STORE_KEY = 'dotwork.bgColors'
const MAX_SAVED = 16

function loadSaved() {
  try {
    const arr = JSON.parse(localStorage.getItem(STORE_KEY))
    if (Array.isArray(arr)) return arr.filter(c => /^#[0-9a-f]{6}$/i.test(c))
  } catch { /* 破損・アクセス不可は空で開始 */ }
  return []
}
function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(saved.value)) } catch { /* 保存不可は無視 */ }
}

const saved = ref(loadSaved())

function setBg(v) { S.bg = v }                       // v: hex か null（=透過）
function onPickerInput(e) { S.bg = e.target.value }  // ドラッグ中のライブプレビュー

// 確定時：プリセット・既存と重複しなければ保存リストへ追加して永続化
function onPickerChange(e) {
  const c = e.target.value.toLowerCase()
  S.bg = c
  if (PRESETS.includes(c) || saved.value.includes(c)) return
  saved.value.push(c)
  if (saved.value.length > MAX_SAVED) saved.value.shift()
  persist()
}

function removeSaved(c) {
  saved.value = saved.value.filter(x => x !== c)
  if (S.bg === c) S.bg = null   // 選択中の色を消したら透過に戻す
  persist()
}
</script>

<template>
  <SidePanel
    title="BACKGROUND"
    tooltip="キャンバスの背景色。スプライトの見え方を確認するための表示専用で、PNG 書き出しには含まれません（書き出しは常に背景透過）。追加したカスタム色は次回も残ります。"
  >
    <div class="bg-grid">
      <!-- 透過（チェッカー）＝デフォルト -->
      <div
        class="bg-sw bg-checker"
        :class="{ sel: S.bg === null }"
        title="透過（チェッカー）"
        @click="setBg(null)"
      ></div>

      <!-- 固定プリセット -->
      <div
        v-for="c in PRESETS"
        :key="c"
        class="bg-sw"
        :class="{ sel: S.bg === c }"
        :style="{ background: c }"
        :title="c"
        @click="setBg(c)"
      ></div>

      <!-- 追加済みカスタム色（右クリックで削除） -->
      <div
        v-for="c in saved"
        :key="c"
        class="bg-sw"
        :class="{ sel: S.bg === c }"
        :style="{ background: c }"
        :title="`${c}（右クリックで削除）`"
        @click="setBg(c)"
        @contextmenu.prevent="removeSaved(c)"
      ></div>

      <!-- カスタム色を追加（クリックでネイティブピッカー） -->
      <div class="bg-sw bg-custom" title="カスタム色を追加" @click="$refs.picker.click()">
        <span>＋</span>
        <input
          ref="picker"
          type="color"
          :value="S.bg || '#000000'"
          @input="onPickerInput"
          @change="onPickerChange"
        >
      </div>
    </div>
  </SidePanel>
</template>
