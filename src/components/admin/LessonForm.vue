<script setup>
import { reactive, ref, watch, computed } from 'vue'
import { uploadRefImage, deleteRefImage } from '../../core/lessonsApi.js'

const props = defineProps({
  // 編集対象のレッスン。新規作成時は空テンプレートを渡す。
  lesson: { type: Object, required: true },
  submitError: { type: String, default: '' },   // 親（保存処理）から渡されるエラー
  saving: { type: Boolean, default: false },     // 保存中（ボタンを無効化）
})
const emit = defineEmits(['save', 'cancel'])

const SIZES = [16, 24, 32, 48]   // ヘッダーの SIZE セレクトと一致させる
const HEX_RE = /^#[0-9a-fA-F]{6}$/
const ACCEPT = ['image/png', 'image/svg+xml']   // お題画像は PNG / SVG のみ
const MAX_BYTES = 2 * 1024 * 1024                // 2MB 上限

// props.lesson のコピーを編集する（親の配列を直接触らない）。
// id は自動採番の PK。新規作成時は undefined（保存時に採番される）。
const form = reactive({ id: undefined, level: 1, title: '', desc: '', size: 16, palette: ['#000000'], ref: '' })
let originalRef = ''   // 編集開始時点の画像 URL（差し替え時の掃除判定に使う）
function reset(l) {
  form.id = l.id
  form.level = l.level ?? 1
  form.title = l.title || ''
  form.desc = l.desc || ''
  form.size = l.size || 16
  form.palette = (l.palette && l.palette.length) ? [...l.palette] : ['#000000']
  form.ref = l.ref || ''
  originalRef = l.ref || ''
}
watch(() => props.lesson, reset, { immediate: true })

const uploading = ref(false)
const error = ref('')

function addColor() { form.palette.push('#000000') }
function removeColor(i) {
  if (form.palette.length <= 1) return   // 最低 1 色は残す
  form.palette.splice(i, 1)
}

async function onFile(e) {
  const file = e.target.files[0]
  if (!file) return
  error.value = ''
  if (!ACCEPT.includes(file.type)) {
    error.value = 'お題画像は PNG または SVG を指定してください。'
    e.target.value = ''; return
  }
  if (file.size > MAX_BYTES) {
    error.value = '画像サイズは 2MB 以下にしてください。'
    e.target.value = ''; return
  }
  uploading.value = true
  try {
    const url = await uploadRefImage(file)
    // このセッションでアップロード済み（=未保存）の画像があれば差し替え前に掃除
    if (form.ref && form.ref !== originalRef) deleteRefImage(form.ref)
    form.ref = url
  } catch (err) {
    error.value = `画像のアップロードに失敗しました: ${err.message || err}`
  } finally {
    uploading.value = false
    e.target.value = ''   // 同じファイルを選び直せるようにする
  }
}

const paletteValid = computed(() => form.palette.every(c => HEX_RE.test(c)))

function validate() {
  if (!form.title.trim()) return 'タイトルを入力してください。'
  if (!Number.isInteger(form.level) || form.level < 1) return 'レベルは 1 以上の整数で入力してください。'
  if (!SIZES.includes(form.size)) return 'サイズが不正です。'
  if (!form.palette.length) return 'パレットの色を 1 つ以上指定してください。'
  if (!paletteValid.value) return 'パレットに不正な色（#rrggbb 形式でない）があります。'
  return ''   // お題画像（ref）は任意。後から追加できる
}

function onSubmit() {
  const msg = validate()
  if (msg) { error.value = msg; return }
  error.value = ''
  emit('save', {
    id: form.id,
    level: form.level,
    title: form.title.trim(),
    desc: form.desc.trim(),
    size: form.size,
    palette: [...form.palette],
    ref: form.ref,
    _prevRef: originalRef,   // 保存成功後に親が差し替え前の画像を掃除する
  })
}

// 保存せず閉じる場合、このセッションでアップロードした未保存画像は掃除する
function onCancel() {
  if (form.ref && form.ref !== originalRef) deleteRefImage(form.ref)
  emit('cancel')
}
</script>

<template>
  <div class="lf-backdrop" @click.self="onCancel">
    <div class="lf-modal">
      <div class="lf-edit">
        <h2 class="lf-head">{{ form.id ? 'レッスンを編集' : '新しいレッスン' }}</h2>

        <div class="lf-row">
          <label class="admin-field lf-narrow">
            <span>レベル</span>
            <input v-model.number="form.level" type="number" min="1">
          </label>
          <label class="admin-field lf-narrow">
            <span>サイズ</span>
            <select v-model.number="form.size">
              <option v-for="s in SIZES" :key="s" :value="s">{{ s }}×{{ s }}</option>
            </select>
          </label>
        </div>

        <label class="admin-field">
          <span>タイトル</span>
          <input v-model="form.title" type="text" placeholder="例: 描き写しに慣れる">
        </label>

        <label class="admin-field">
          <span>説明</span>
          <textarea v-model="form.desc" rows="3" placeholder="レッスンの説明文"></textarea>
        </label>

        <div class="admin-field">
          <span>パレット（使用する色）</span>
          <div class="lf-palette">
            <div v-for="(c, i) in form.palette" :key="i" class="lf-color">
              <input type="color" :value="HEX_RE.test(c) ? c : '#000000'" @input="form.palette[i] = $event.target.value">
              <input class="lf-hex" type="text" v-model="form.palette[i]" maxlength="7">
              <button type="button" class="lf-x" :disabled="form.palette.length <= 1" @click="removeColor(i)">✕</button>
            </div>
          </div>
          <button type="button" style="margin-top:6px" @click="addColor">＋ 色を追加</button>
        </div>

        <div class="admin-field">
          <span>お題画像（PNG / SVG・2MBまで・任意）</span>
          <input type="file" accept="image/png,image/svg+xml" @change="onFile">
          <span v-if="uploading" class="lf-hint">アップロード中…</span>
        </div>

        <p v-if="error || submitError" class="admin-error">{{ error || submitError }}</p>

        <div class="lf-actions">
          <button @click="onCancel">キャンセル</button>
          <button class="btn-a" :disabled="uploading || saving" @click="onSubmit">{{ saving ? '保存中…' : '保存' }}</button>
        </div>
      </div>

      <!-- ライブプレビュー：レッスン選択カードの見た目 -->
      <div class="lf-preview">
        <span class="lf-preview-label">プレビュー</span>
        <article class="lesson-card">
          <div class="lesson-thumb">
            <img v-if="form.ref" :src="form.ref" :alt="form.title">
            <div v-else class="lf-noimg">画像なし（任意）</div>
          </div>
          <div class="lesson-body">
            <div class="lesson-meta">
              <span class="lesson-lv">Lv.{{ form.level }}</span>
              <span class="lesson-spec">{{ form.size }}×{{ form.size }} ・ {{ form.palette.length }}色</span>
            </div>
            <h3 class="lesson-title">{{ form.title || '（タイトル未入力）' }}</h3>
            <p class="lesson-desc">{{ form.desc || '（説明未入力）' }}</p>
            <button type="button" class="abtn btn-a">▦ このレッスンを始める</button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
