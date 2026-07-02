<script setup>
import { ref } from 'vue'

defineProps({
  loading: Boolean,
  error: String,
})
const emit = defineEmits(['submit'])

const loginId = ref('')
const password = ref('')

function onSubmit() {
  if (!loginId.value || !password.value) return
  emit('submit', { loginId: loginId.value, password: password.value })
}
</script>

<template>
  <div class="admin-login">
    <form class="admin-login-box" @submit.prevent="onSubmit">
      <span class="admin-logo">DOTWORK ADMIN</span>
      <p class="admin-login-note">管理者アカウントでログインしてください。</p>

      <label class="admin-field">
        <span>ログインID</span>
        <input v-model="loginId" type="text" autocomplete="username" required>
      </label>
      <label class="admin-field">
        <span>パスワード</span>
        <input v-model="password" type="password" autocomplete="current-password" required>
      </label>

      <p v-if="error" class="admin-error">{{ error }}</p>

      <button class="btn-a" type="submit" :disabled="loading">
        {{ loading ? 'ログイン中…' : 'ログイン' }}
      </button>
    </form>
  </div>
</template>
