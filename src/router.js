import { createRouter, createWebHistory } from 'vue-router'
import EditorView from './views/EditorView.vue'

// / = エディタ本体、/admin = 管理画面（DOTWORK ADMIN）。UI 上の導線は置かず直リンクのみ。
// 管理画面はめったに開かないため遅延ロードしてメインバンドルから切り離す。
// /admin は認証＋共通ヘッダーの「シェル」。中身は子ルートに分離し、機能追加はここに足す。
//   /admin         → AdminHome（管理トップのメニュー）
//   /admin/lessons → LessonAdmin（レッスン管理）
const routes = [
  { path: '/', name: 'editor', component: EditorView },
  {
    path: '/admin',
    component: () => import('./views/AdminView.vue'),
    children: [
      { path: '', name: 'admin', component: () => import('./views/AdminHome.vue') },
      { path: 'lessons', name: 'admin-lessons', component: () => import('./views/LessonAdmin.vue') },
    ],
  },
  // 未知のパスはエディタへ
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
