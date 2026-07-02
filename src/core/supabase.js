import { createClient } from '@supabase/supabase-js'

// 接続情報は .env（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）から読む。
// 未設定なら client は null。レッスン読み込みはバンドル JSON にフォールバックし、
// 管理画面（/admin）は「Supabase 未設定」の案内を出す。
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = (url && key) ? createClient(url, key) : null
export const isSupabaseConfigured = !!supabase
