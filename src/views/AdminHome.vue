<script setup>
// 管理トップのメニュー。今後、管理機能が増えたらここにリンクを足していく。
</script>

<template>
  <nav class="admin-menu">
    <router-link class="admin-menu-item" to="/admin/lessons">
      <div class="amm-title">▦ レッスン管理</div>
      <div class="amm-desc">レッスンの追加・編集・並び替え・削除を行います。</div>
    </router-link>
  </nav>
</template>
