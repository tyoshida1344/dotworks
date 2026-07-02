<script setup>
import { ref, onMounted } from 'vue'
import { isSupabaseConfigured } from '../core/supabase.js'
import { signIn, signOut, getSession } from '../core/lessonsApi.js'
import AdminLogin from '../components/admin/AdminLogin.vue'

// /admin のシェル：Supabase 設定チェック・ログイン・共通ヘッダー・ログアウトを担い、
// 各管理機能（レッスン管理など）は子ルート（<router-view>）に表示する。
const configured = isSupabaseConfigured

const session = ref(null)
const loginLoading = ref(false)
const loginError = ref('')

onMounted(async () => {
  if (!configured) return
  // 保存済みトークンが有効ならログイン状態で開始（無効／未ログインならログイン画面）。
  session.value = await getSession()
})

async function handleLogin({ loginId, password }) {
  loginLoading.value = true
  loginError.value = ''
  try {
    await signIn(loginId, password)
    session.value = { ok: true }
  } catch (e) {
    loginError.value = `ログインに失敗しました: ${e.message || e}`
  } finally {
    loginLoading.value = false
  }
}

async function handleLogout() {
  await signOut()
  session.value = null
}
</script>

<template>
  <div id="admin">
    <!-- Supabase 未設定 -->
    <div v-if="!configured" class="admin-notice">
      <span class="admin-logo">DOTWORK ADMIN</span>
      <p>Supabase が未設定です。<code>.env</code> に <code>VITE_SUPABASE_URL</code> と <code>VITE_SUPABASE_ANON_KEY</code> を設定してください。</p>
      <p class="admin-login-note">セットアップ手順: <code>README.md</code> の「レッスン管理（Supabase）」</p>
    </div>

    <!-- 未ログイン -->
    <AdminLogin
      v-else-if="!session"
      :loading="loginLoading"
      :error="loginError"
      @submit="handleLogin"
    />

    <!-- 管理画面シェル（ヘッダー＋子ルート） -->
    <div v-else class="admin-main">
      <header class="admin-head">
        <router-link class="admin-logo" to="/admin">DOTWORK ADMIN</router-link>
        <div class="admin-head-actions">
          <button @click="handleLogout">ログアウト</button>
        </div>
      </header>

      <router-view />
    </div>
  </div>
</template>
