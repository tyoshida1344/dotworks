import { supabase } from './supabase.js'

// レッスンの読み取りは anon で直接（公開）。認証・書き込み・お題画像は Edge Function（admin）経由。
// 管理者は独自アカウント（admins テーブル）＋セッショントークンで認証する（Supabase Auth は使わない）。
const TABLE = 'lessons'
const BUCKET = 'lesson-refs'
const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin`
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY
const TOKEN_KEY = 'dotwork.adminToken'   // セッショントークンの保存キー（localStorage）

function getToken() { return localStorage.getItem(TOKEN_KEY) }
function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) }

// DB 行 → フロントのレッスン形（desc は SQL 予約語のため DB では description）
function rowToLesson(r) {
  return {
    id: r.id,
    level: r.level,
    title: r.title,
    desc: r.description,
    size: r.size,
    palette: Array.isArray(r.palette) ? r.palette : [],
    ref: r.ref,
    sortOrder: r.sort_order,
  }
}

function assertClient() {
  if (!supabase) throw new Error('Supabase が未設定です（.env を確認してください）。')
}

// 管理 API（Edge Function）呼び出し。認証・書き込みはすべてここを通す。
// セッショントークンは x-admin-token で送る（Supabase Auth の JWT は使わない）。
async function callAdmin(action, payload = {}) {
  assertClient()
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON,
      'x-admin-token': getToken() ?? '',
    },
    body: JSON.stringify({ action, ...payload }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `管理APIエラー (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

// ── レッスン読み取り（公開・anon で直接） ─────────
// 並び順は sort_order 昇順。論理削除済み（deleted_at）は除外。
export async function fetchLessons() {
  assertClient()
  const { data, error } = await supabase
    .from(TABLE).select('*').is('deleted_at', null).order('sort_order', { ascending: true })
  if (error) throw error
  return data.map(rowToLesson)
}

// ── レッスン書き込み（Edge Function 経由） ─────────
export async function createLesson(lesson) {
  const { lesson: row } = await callAdmin('saveLesson', { lesson: { ...lesson, id: undefined } })
  return rowToLesson(row)
}

export async function updateLesson(id, lesson) {
  const { lesson: row } = await callAdmin('saveLesson', { lesson: { ...lesson, id } })
  return rowToLesson(row)
}

export async function deleteLesson(id) {
  await callAdmin('deleteLesson', { id })   // 論理削除（お題画像は残す）
}

export async function reorderLessons(orderedIds) {
  await callAdmin('reorderLessons', { ids: orderedIds })
}

// ── お題画像（署名付きURLでアップロード / Edge Function で削除） ──
// CDN キャッシュ汚染・URL 列挙を避けるため、毎回ユニークなファイル名で保存する（発行は Edge Function）。
export async function uploadRefImage(file) {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const { path, uploadToken, publicUrl } = await callAdmin('createUploadUrl', { ext })
  const { error } = await supabase.storage.from(BUCKET)
    .uploadToSignedUrl(path, uploadToken, file, { contentType: file.type || undefined })
  if (error) throw error
  return publicUrl
}

// 不要になった画像の掃除。失敗しても例外は投げず警告に留める。
export async function deleteRefImage(refUrl) {
  if (!refUrl) return
  try {
    await callAdmin('deleteImage', { url: refUrl })
  } catch (e) {
    console.warn('[lessons] お題画像の削除に失敗しました（無視して継続）。', e)
  }
}

// ── 認証（独自: admins テーブル＋セッショントークン） ──
export async function signIn(loginId, password) {
  const { token } = await callAdmin('login', { login_id: loginId, password })
  setToken(token)
  return token
}

export async function signOut() {
  try { await callAdmin('logout') } catch { /* 失敗してもローカルのトークンは消す */ }
  setToken(null)
}

// 保存済みトークンが今も有効か確認する（有効ならセッション相当のオブジェクトを返す）。
export async function getSession() {
  if (!supabase || !getToken()) return null
  try {
    await callAdmin('me')
    return { token: getToken() }
  } catch (e) {
    // 401（失効・無効）のときだけトークンを消す。一時的な障害では残し、
    // 次回アクセス時に再検証できるようにする（誤ログアウトの防止）。
    if (e.status === 401) setToken(null)
    return null
  }
}
