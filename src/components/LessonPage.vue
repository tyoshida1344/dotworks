<script setup>
import { watch } from 'vue'
import { ui } from '../core/ui.js'
import { LESSONS, lessonState, startLesson, ensureLessons } from '../core/lessons.js'

// レッスン画面を初めて開いたときに一覧を読み込む（初期ロードを軽くするため遅延）。
watch(() => ui.lessonPageOpen, open => { if (open) ensureLessons() })

function onStart(lesson) {
  // 開始すると現在の描画は消えるため確認する（ヘッダーのリサイズと同様の作法）
  if (!confirm(`「${lesson.title}」を始めますか？現在の描画は消去されます。`)) return
  startLesson(lesson)
}
</script>

<template>
  <div id="lpage" :class="{ open: ui.lessonPageOpen }">
    <div id="lpage-inner">
      <header id="lpage-head">
        <span id="lpage-logo">LESSONS</span>
        <p>お題を見ながらドット絵を描いて練習しましょう。レベルごとにキャンバスサイズと使える色が固定されます。</p>
      </header>

      <div class="lesson-grid">
        <article
          v-for="l in LESSONS"
          :key="l.id"
          class="lesson-card"
          :class="{ current: lessonState.active && lessonState.active.id === l.id }"
        >
          <div class="lesson-thumb">
            <img :src="l.ref" :alt="l.title">
          </div>
          <div class="lesson-body">
            <div class="lesson-meta">
              <span class="lesson-lv">Lv.{{ l.level }}</span>
              <span class="lesson-spec">{{ l.size }}×{{ l.size }} ・ {{ l.palette.length }}色</span>
            </div>
            <h3 class="lesson-title">{{ l.title }}</h3>
            <p class="lesson-desc">{{ l.desc }}</p>
            <button class="abtn btn-a" @click="onStart(l)">▦ このレッスンを始める</button>
          </div>
        </article>
      </div>
    </div>

    <button id="lpage-close" @click="ui.lessonPageOpen = false">✕ Close</button>
  </div>
</template>
