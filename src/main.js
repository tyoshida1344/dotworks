import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import './style.css'

// レッスン一覧はレッスン画面を開いたときに読み込む（LessonPage.vue）。
// こうすると @supabase/supabase-js がエディタ初期ロードのバンドルに乗らない。
createApp(App).use(router).mount('#app')
