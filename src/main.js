import './nobounce'
import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'
import { pageAnim } from './pageAnim'
import { createRouter, createWebHashHistory } from '@ionic/vue-router'
import App from './App.vue'
import Tabs from './views/Tabs.vue'
import { load, state } from './store'
import { initCloud } from './cloud'
import { initStrava } from './strava'
import { initWeights } from './weight'
import { initMeasures } from './measures'
import { initAccount, account } from './account'
import { initI18n, addPhrases, lang, loadLang } from './i18n'
import { initErrors } from './errors'
initErrors()
import { initUpdater } from './updater'
import { initPlan } from './customPlan'
import { enableStatsCache } from './stats'
import { applyLook } from './theme'
applyLook() // before anything is drawn, so there is no flash of the wrong colours

import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'
import '@ionic/vue/css/palettes/dark.class.css'
import './theme.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/tabs/home' },
    { path: '/progress/:day', component: () => import('./views/PlanProgressView.vue') },
    { path: '/exercise/:day/:i', component: () => import('./views/ExerciseView.vue') },
    { path: '/workout/:id', component: () => import('./views/WorkoutView.vue') },
    { path: '/plan/:day/edit', component: () => import('./views/PlanEditView.vue') },
    { path: '/plan/:day', component: () => import('./views/PlanView.vue') },
    { path: '/plans', component: () => import('./views/PlansView.vue') },
    { path: '/weight', component: () => import('./views/WeightView.vue') },
    { path: '/measures', component: () => import('./views/MeasuresView.vue') },
    { path: '/settings', component: () => import('./views/SettingsView.vue') },
    { path: '/settings/:sec', component: () => import('./views/SettingsView.vue') },
    { path: '/welcome', component: () => import('./views/WelcomeView.vue') },
    { path: '/session/:id', component: () => import('./views/SessionView.vue') },
    { path: '/tabs/', component: Tabs, children: [
      { path: '', redirect: '/tabs/home' },
      { path: 'home', component: () => import('./views/HomeView.vue') },
      { path: 'train', component: () => import('./views/TrainView.vue') },
      { path: 'progress', component: () => import('./views/ProgressView.vue') },
      { path: 'history', component: () => import('./views/HistoryView.vue') },
      { path: 'weight', redirect: '/weight' },
      { path: 'profile', component: () => import('./views/ProfileView.vue') },
      { path: 'settings', redirect: '/settings' },
      { path: 'plans', redirect: '/plans' },
      { path: ':rest(.*)', redirect: '/tabs/home' }
    ] },
    { path: '/:rest(.*)*', redirect: '/tabs/home' }
  ]
})

// after an update the old page may ask for files that no longer exist: reload once into the new version
router.onError(err => {
  if (/dynamically imported module|Importing a module script failed|Failed to fetch/i.test(String(err?.message || err))) {
    let last = 0
    try { last = +sessionStorage.getItem('reloadedAt') || 0 } catch {}
    if (Date.now() - last > 10000) {
      try { sessionStorage.setItem('reloadedAt', String(Date.now())) } catch {}
      location.reload()
    }
  }
})

initUpdater()

// first start on a phone with nothing in it: language + account first (an existing user never sees it)
const needsWelcome = () => { try { if (localStorage.getItem('onboarded')) return false } catch { return false }
  return !Object.keys(state.sessions).length && !account.nick }
// safety net: a page must never stay invisible after navigation (black screen on the phone)
router.afterEach(() => setTimeout(() => {
  document.querySelectorAll('ion-router-outlet > .ion-page.ion-page-invisible:not(.ion-page-hidden)').forEach(el => {
    if (el === el.parentElement.lastElementChild) el.classList.remove('ion-page-invisible')
  })
}, 900))
router.beforeEach(to => {
  if (to.path !== '/welcome' && needsWelcome()) return '/welcome'
  if (to.path === '/welcome' && !needsWelcome()) return '/tabs/home'
})

enableStatsCache()
const langReady = loadLang().catch(() => {}) // English dictionary only on English phones
initPlan().then(load).then(() => initAccount().catch(() => {})).then(() => langReady).then(() => {
  initCloud()
  initStrava()
  initWeights()
  initMeasures()
  const app = createApp(App).use(IonicVue, { mode: 'ios', navAnimation: pageAnim }).use(router)
  router.isReady().then(() => {
    app.mount('#app')
    initI18n()
    // exercise catalogue names in English (only needed when the app is not in Polish)
    if (lang !== 'pl') import('./catalog').then(c => addPhrases(c.catalogEN(), n => { const r = c.byName(n); return r ? c.compose(r.base, r.sel).nameEn : undefined })).catch(() => {})
    // warm up every screen in the background, so the first visit of a tab or page doesn't wait for its code
    const warm = () => router.getRoutes().forEach(r => { const c = r.components?.default; if (typeof c === 'function') /** @type {any} */ (c)().catch(() => {}) })
    ;(window.requestIdleCallback || (f => setTimeout(f, 1200)))(warm, { timeout: 2500 })
  })
})
