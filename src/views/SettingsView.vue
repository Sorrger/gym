<template>
  <ion-page class="settings-page">
    <div class="mini-bar" :class="{ on: scrolled }"><button class="mb-back press" @click="goBack" aria-label="Wróć"><ion-icon :icon="chevronBack" /></button><span>{{ sec ? MENU.find(m => m.k === sec)?.t : 'Ustawienia' }}</span></div>
    <ion-content :fullscreen="true" :scroll-events="true" @ionScroll="onScroll">
      <header class="big-head sub-page">
        <button class="back press" @click="goBack"><ion-icon :icon="chevronBack" /> {{ sec ? 'Ustawienia' : 'Profil' }}</button>
        <h1 class="t-large">{{ sec ? MENU.find(m => m.k === sec)?.t : 'Ustawienia' }}</h1>
      </header>
      <div class="page">
        <!-- menu: one row per section (each opens its own page) -->
        <div v-if="!sec" class="ios-group menu">
          <button v-for="m in MENU" :key="m.k" class="row press" @click="router.push('/settings/' + m.k)">
            <span class="sq" :style="{ '--c': m.c }"><ion-icon :icon="m.i" /></span>
            <div class="grow"><b>{{ m.t }}</b><span>{{ m.sub() }}</span></div>
            <span v-if="m.warn && m.warn()" class="dot-warn"></span>
            <ion-icon :icon="chevronForward" class="chev" />
          </button>
        </div>
        <template v-if="!sec">
          <p class="section-foot ver">Gym · wersja {{ VERSION }}</p>
          <div v-if="errs.length" class="ios-group">
            <button class="row press" @click="copyErrors">
              <span class="sq" style="--c: #ff3b30"><ion-icon :icon="warningOutline" /></span>
              <div class="grow"><b>Błędy apki: {{ errs.length }}</b><span>Dotknij, żeby skopiować (do zgłoszenia)</span></div>
            </button>
          </div>
        </template>

        <component v-if="sec" :is="SECTIONS[sec]" @msg="m => (msg = m)" />
      </div>
      <ion-toast :is-open="!!msg" :message="t(msg)" :duration="2200" position="top" @didDismiss="msg = ''" />
    </ion-content>
  </ion-page>
</template>

<script setup>
// Settings: a menu, and one page per section (/settings/:sec) – each section is its own component in ./settings
import { ref } from 'vue'
import { IonPage, IonContent, IonIcon, IonToast, useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import { cloudUploadOutline, chevronForward, chevronBack, colorPaletteOutline, languageOutline, barbellOutline, trendingUpOutline, scaleOutline, heartOutline, warningOutline } from 'ionicons/icons'
import { t, lang } from '../i18n'
import { useScrolled } from '../useScrolled'
import { prefs } from '../prefs'
import { VERSION, readErrors, clearErrors } from '../errors'
import { ask } from '../dialog'
import { look, ACCENTS } from '../theme'
import { cloud } from '../cloud'
import { status as stravaStatus } from '../strava'
import { REST } from './settings/rules'
import LookSection from './settings/LookSection.vue'
import LangSection from './settings/LangSection.vue'
import TrainingSection from './settings/TrainingSection.vue'
import ProgressSection from './settings/ProgressSection.vue'
import WeightSection from './settings/WeightSection.vue'
import BackupSection from './settings/BackupSection.vue'
import StravaSection from './settings/StravaSection.vue'

const SECTIONS = { look: LookSection, lang: LangSection, training: TrainingSection, progress: ProgressSection, weight: WeightSection, backup: BackupSection, strava: StravaSection }
const { scrolled, onScroll } = useScrolled()
const router = useIonRouter()
const route = useRoute()
const sec = SECTIONS[route.params.sec] ? String(route.params.sec) : '' // fixed per page (Ionic keeps hidden pages alive)
const goBack = () => (router.canGoBack() ? router.back() : router.navigate(sec ? '/settings' : '/tabs/profile', 'back', 'replace'))
const msg = ref('')

const errs = ref(readErrors())
async function copyErrors() {
  const txt = 'Gym ' + VERSION + '\n' + errs.value.map(e => new Date(e.t).toISOString() + ' ' + e.at + ' ' + e.msg).join('\n')
  try { await navigator.clipboard.writeText(txt); msg.value = 'Skopiowano – wklej w zgłoszeniu' } catch { msg.value = 'Nie udało się skopiować' }
  const { role } = await ask({ title: 'Wyczyścić listę błędów?', message: 'Lista jest tylko na tym telefonie.', buttons: [{ text: 'Wyczyść', role: 'ok', kind: 'primary' }, { text: 'Zostaw', role: 'cancel', kind: 'plain' }] })
  if (role === 'ok') { clearErrors(); errs.value = [] }
}

const MENU = [
  { k: 'look', t: 'Wygląd', i: colorPaletteOutline, c: '#af52de', sub: () => ({ system: 'Jak telefon', light: 'Jasny', dark: 'Ciemny' })[look.mode] + ' · ' + (ACCENTS.find(a => a.id === look.accent)?.name || '') },
  { k: 'lang', t: 'Język · Language', i: languageOutline, c: '#5856d6', sub: () => (lang === 'en' ? 'English' : 'Polski') },
  { k: 'training', t: 'Trening', i: barbellOutline, c: '#ff3b30', sub: () => ({ auto: 'Podpowiedzi same', chip: 'Podpowiedzi na dotyk', off: 'Bez podpowiedzi' })[prefs.coach] + (prefs.restTimer ? ' · przerwa ' + REST.fmt(prefs.restSec) : '') + (prefs.deload ? ' · lżejszy tydzień co ' + prefs.deloadEvery + ' tyg.' : '') },
  { k: 'progress', t: 'Progresja', i: trendingUpOutline, c: '#34c759', sub: () => 'Zapas ' + prefs.rirUp + '+ · krok ' + String(prefs.stepKg).replace('.', ',') + ' kg' },
  { k: 'weight', t: 'Waga ciała', i: scaleOutline, c: '#30b0c7', sub: () => (prefs.weightOn ? ({ cut: 'Redukcja', maintain: 'Utrzymanie', bulk: 'Masa' })[prefs.goal] : 'Wyłączone') },
  { k: 'backup', t: 'Kopia zapasowa', i: cloudUploadOutline, c: '#0a84ff', sub: () => (cloud.token ? (cloud.error ? 'Błąd kopii' : 'GitHub · automatycznie') : 'Tylko w telefonie'), warn: () => cloud.token && cloud.error && cloud.error !== 'Brak połączenia' },
  { k: 'strava', t: 'Strava', i: heartOutline, c: '#fc4c02', sub: () => ({ on: 'Połączona', waiting: 'Czeka' })[stravaStatus()] || 'Niepołączona' }]
</script>

<style scoped>
.page { padding-top: 8px; }
.big-head.sub-page { padding-top: calc(env(safe-area-inset-top) + 6px); }
.back { display: inline-flex; align-items: center; gap: 2px; margin: 0 0 10px 10px; padding: 6px 8px; border: 0; background: none; font: inherit; font-size: 17px; color: var(--accent); }
.back ion-icon { font-size: 22px; }
.mb-back { position: absolute; left: 8px; bottom: 4px; width: 36px; height: 36px; border: 0; background: none; color: var(--accent); font-size: 24px; display: grid; place-items: center; pointer-events: auto; }
.mini-bar { pointer-events: none; }
.menu { margin-top: 4px; }
.dot-warn { width: 9px; height: 9px; border-radius: 50%; background: var(--app-bad); flex: none; }
.ver { text-align: center; margin-top: 18px; }
</style>

<style>
/* shared by the section components (./settings/*.vue) */
.settings-page .ios-group.gap { margin-top: 24px; }
.settings-page .ios-group + .ios-group { margin-top: 12px; }
.settings-page .row.danger b { color: var(--app-bad); text-align: center; }
.settings-page .row:disabled { opacity: .5; }
.settings-page .row .grow b { display: block; font-size: 16px; font-weight: 600; }
.settings-page .row .grow span { display: block; font-size: 13px; color: var(--app-muted); }
.settings-page .chev { color: var(--app-faint); font-size: 18px; }
.settings-page .look .lbl { display: block; font-size: 13px; color: var(--app-muted); margin: 0 2px 6px; }
.settings-page .seg3 { display: flex; gap: 4px; padding: 3px; border-radius: 10px; background: var(--app-field); margin-bottom: 14px; }
.settings-page .seg3 button { flex: 1; border: 0; border-radius: 8px; padding: 8px 2px; font: inherit; font-size: 14px; font-weight: 600; background: none; color: var(--ion-text-color); }
.settings-page .seg3 button.on { background: var(--app-card); color: var(--accent); box-shadow: 0 1px 3px rgba(0,0,0,.12); }
.settings-page .sw { display: flex; gap: 6px; }
.settings-page .sw button { flex: 1 1 0; min-width: 0; border: 0; background: none; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 2px 0; font: inherit; color: var(--app-muted); }
.settings-page .sw i { width: 34px; height: 34px; border-radius: 50%; display: block; box-shadow: 0 0 0 2px var(--app-card), 0 0 0 2px transparent; }
.settings-page .sw button.on i { box-shadow: 0 0 0 2px var(--app-card), 0 0 0 4px var(--ion-text-color); }
.settings-page .sw small { font-size: 11px; }
.settings-page .sw button.on small { color: var(--ion-text-color); font-weight: 600; }
.settings-page .hint { margin: -6px 2px 0; font-size: 13px; color: var(--app-muted); line-height: 1.35; }
.settings-page .toggles { margin-top: 10px; }
.settings-page .sw-t { width: 51px; height: 31px; border-radius: 999px; background: var(--app-field); position: relative; flex: none; transition: background .2s; }
.settings-page .sw-t i { position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.2); transition: transform .2s; }
.settings-page .sw-t.on { background: #34c759; }
.settings-page .sw-t.on i { transform: translateX(20px); }
.settings-page .stepper { display: flex; align-items: center; gap: 4px; flex: none; }
.settings-page .stepper button { width: 34px; height: 34px; border: 0; border-radius: 9px; background: var(--app-field); font: inherit; font-size: 20px; color: var(--accent); }
.settings-page .stepper button:disabled { opacity: .4; }
.settings-page .stepper b { min-width: 54px; text-align: center; white-space: nowrap; font-size: 16px; }
.settings-page .reset-btn { display: block; width: calc(100% - 32px); margin: 0 16px 6px; padding: 12px; border: 0; border-radius: var(--r-md); background: var(--app-card); font: inherit; font-size: 15px; font-weight: 600; color: var(--accent); }
</style>
