import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'
import { createRouter, createWebHashHistory } from '@ionic/vue-router'
import App from './App.vue'
import Tabs from './views/Tabs.vue'
import { load } from './store'
import { initCloud } from './cloud'
import { initUpdater } from './updater'

import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'
import '@ionic/vue/css/palettes/dark.system.css'
import './theme.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/tabs/home' },
    { path: '/exercise/:day/:i', component: () => import('./views/ExerciseView.vue') },
    { path: '/workout/:id', component: () => import('./views/WorkoutView.vue') },
    { path: '/tabs/', component: Tabs, children: [
      { path: '', redirect: '/tabs/home' },
      { path: 'home', component: () => import('./views/HomeView.vue') },
      { path: 'progress', component: () => import('./views/ProgressView.vue') },
      { path: 'history', component: () => import('./views/HistoryView.vue') },
      { path: 'settings', component: () => import('./views/SettingsView.vue') }
    ] }
  ]
})

// after an update the old page may ask for files that no longer exist: reload once into the new version
router.onError(err => {
  if (/dynamically imported module|Importing a module script failed|Failed to fetch/i.test(String(err?.message || err))) {
    let last = 0
    try { last = +sessionStorage.getItem('reloadedAt') || 0 } catch {}
    if (Date.now() - last > 10000) {
      try { sessionStorage.setItem('reloadedAt', Date.now()) } catch {}
      location.reload()
    }
  }
})

initUpdater()

load().then(() => {
  initCloud()
  const app = createApp(App).use(IonicVue, { mode: 'ios' }).use(router)
  router.isReady().then(() => app.mount('#app'))
})
