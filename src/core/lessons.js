import { reactive } from 'vue'
import { S } from './state.js'
import { ui } from './ui.js'
import { resize } from './canvas.js'
import { clearHistory } from './history.js'

// Supabase が設定されているか（env のみで判定）。
// ここでは supabase.js を静的 import しない。@supabase/supabase-js を
// エディタの初期バンドルから切り離し、必要になった時だけ動的 import するため。
const configured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

// 表示用のレッスン一覧。ensureLessons() / loadLessons() で読み込む。
// リアクティブ配列なので、読み込み完了時に LessonPage の v-for が自動更新される。
export const LESSONS = reactive([])

let loaded = false   // 読み込み済みか（ensureLessons の重複取得を防ぐ）

// レッスン一覧を Supabase から読み込む（未設定・取得失敗時は空）。
export async function loadLessons() {
  let list = []
  if (configured) {
    try {
      const { fetchLessons } = await import('./lessonsApi.js')
      list = await fetchLessons()
    } catch (e) {
      console.warn('[lessons] Supabase からの取得に失敗しました。', e)
    }
  }
  // お題画像（ref）が無いレッスンは未公開扱い。エディタのレッスン一覧には出さない
  // （管理画面は fetchLessons で全件見えるので、画像を付ければ公開される）。
  list = list.filter(l => l.ref)
  LESSONS.splice(0, LESSONS.length, ...list)
  loaded = true
  return LESSONS
}

// まだ読み込んでいなければ読み込む（レッスン画面を開いたときに呼ぶ）。
export function ensureLessons() {
  return loaded ? Promise.resolve(LESSONS) : loadLessons()
}

// 一覧を「未読込」に戻す。管理画面で更新した後に呼ぶと、次に開いたとき最新を取り直す。
export function invalidateLessons() {
  loaded = false
}

// レッスンモードの状態。アンドゥ履歴・PNG 書き出しには含めない揮発性状態。
export const lessonState = reactive({
  active: null,        // 進行中のレッスン定義 | null
})

// レッスンを開始する。現在の描画をクリアし、サイズ・パレットをレッスンに固定する。
// 注意: ヘッダーの SIZE 変更（resetCanvas）と違い、レッスンのサイズは既定値として保存しない。
export function startLesson(lesson) {
  S.cols = S.rows = lesson.size
  S.pixels = new Array(lesson.size * lesson.size).fill(null)
  clearHistory()
  S.palette = [...lesson.palette]
  // レッスンを始めた直後にすぐ塗り始められるよう、色セットの先頭の色を選択状態にする
  S.color = lesson.palette[0]
  ui.palKey = 'lesson'
  ui.lessonPageOpen = false

  lessonState.active = lesson
  resize()
}

// レッスンを終了して通常モードへ戻る。描いた絵・サイズ・パレットはそのまま残す。
export function exitLesson() {
  lessonState.active = null
}
