import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'
import { createRouter, createWebHashHistory } from '@ionic/vue-router'
import App from './App.vue'
import Tabs from './views/Tabs.vue'
import { load } from './store'

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

load().then(() => {
  const app = createApp(App).use(IonicVue, { mode: 'ios' }).use(router)
  router.isReady().then(() => app.mount('#app'))
})
