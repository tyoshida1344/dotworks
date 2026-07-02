// 管理者の独自認証（admins テーブル）と、レッスン／お題画像の書き込みを担う Edge Function。
// クライアントは anon キーしか持たないため、書き込みは全てここ（service_role）を通す。
// 認証: admin_sessions のトークンを `x-admin-token` ヘッダで受け取る（login/logout 以外は必須）。
// DB にはトークンの sha256 ハッシュだけを保存するので、受け取った生トークンは毎回ハッシュして照合する。
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY は Supabase ランタイムが自動注入する。
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const url = Deno.env.get("SUPABASE_URL")!
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const BUCKET = "lesson-refs"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}

// DB に保存したハッシュ（pg: encode(digest(token,'sha256'),'hex')）と一致させる
async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

    const db = createClient(url, serviceKey, { auth: { persistSession: false } })

    let body: any
    try { body = await req.json() } catch { return json({ error: "Invalid JSON" }, 400) }
    const action = body?.action as string

    // ── login はトークン不要 ──
    if (action === "login") {
      const { login_id, password } = body
      if (!login_id || !password) return json({ error: "ログインIDとパスワードを入力してください。" }, 400)
      const { data, error } = await db.rpc("admin_login", { p_login_id: login_id, p_password: password })
      if (error) return json({ error: error.message }, 500)
      if (!data) return json({ error: "ログインID かパスワードが違います。" }, 401)
      return json({ token: data })
    }

    // ── 以降はトークン必須。DB はハッシュ保存なので照合はハッシュで行う ──
    const token = (req.headers.get("x-admin-token") ?? "").trim()
    if (!token) return json({ error: "認証が必要です。" }, 401)
    const tokenHash = await sha256hex(token)

    if (action === "logout") {
      await db.from("admin_sessions").delete().eq("token", tokenHash)
      return json({ ok: true })
    }

    // トークン → セッション検証
    const { data: sess } = await db
      .from("admin_sessions")
      .select("admin_id, expires_at")
      .eq("token", tokenHash)
      .maybeSingle()
    if (!sess || new Date(sess.expires_at) <= new Date()) {
      return json({ error: "セッションが無効です。再ログインしてください。" }, 401)
    }

    switch (action) {
      case "me":
        return json({ ok: true })

      case "saveLesson": {
        const l = body.lesson ?? {}
        const row = {
          level: l.level, title: l.title, description: l.desc,
          size: l.size, palette: l.palette, ref: l.ref,
        }
        if (l.id) {
          const { data, error } = await db.from("lessons")
            .update({ ...row, updated_at: new Date().toISOString() })
            .eq("id", l.id).select().single()
          if (error) return json({ error: error.message }, 400)
          return json({ lesson: data })
        }
        // 新規は末尾に追加（未削除の最大 sort_order + 1、無ければ 1）
        const { data: maxRows } = await db.from("lessons")
          .select("sort_order").is("deleted_at", null)
          .order("sort_order", { ascending: false }).limit(1)
        const nextOrder = maxRows && maxRows.length ? maxRows[0].sort_order + 1 : 1
        const { data, error } = await db.from("lessons")
          .insert({ ...row, sort_order: nextOrder }).select().single()
        if (error) return json({ error: error.message }, 400)
        return json({ lesson: data })
      }

      case "deleteLesson": {
        const { error } = await db.from("lessons")
          .update({ deleted_at: new Date().toISOString() }).eq("id", body.id)
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }

      case "reorderLessons": {
        const { error } = await db.rpc("reorder_lessons", { ids: body.ids })
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }

      case "createUploadUrl": {
        // ユニークなパスに署名付きアップロードURLを発行（クライアントが直接そこへ PUT する）
        const ext = String(body.ext ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png"
        const path = `${crypto.randomUUID()}.${ext}`
        const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path)
        if (error) return json({ error: error.message }, 400)
        const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path)
        return json({ path, uploadToken: data.token, publicUrl: pub.publicUrl })
      }

      case "deleteImage": {
        // 公開URLからバケット内パスを割り出して削除（クリーンアップ用途・失敗は無視）
        const marker = `/object/public/${BUCKET}/`
        const i = String(body.url ?? "").indexOf(marker)
        if (i === -1) return json({ ok: true })
        const path = String(body.url).slice(i + marker.length)
        if (path) await db.storage.from(BUCKET).remove([path])
        return json({ ok: true })
      }

      default:
        return json({ error: `unknown action: ${action}` }, 400)
    }
  } catch (e) {
    // 想定外の例外でも CORS 付き JSON で返す（クライアントが原因不明の CORS エラーにならないように）
    return json({ error: `サーバーエラー: ${(e as Error)?.message ?? e}` }, 500)
  }
})
