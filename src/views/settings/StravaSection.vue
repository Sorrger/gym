<template>
  <div>
    <h3 class="section-title">Strava · tętno z zegarka</h3>
    <div class="ios-group" :style="{ '--c': '#fc4c02' }">
      <template v-if="sst === 'on'">
        <div class="row">
          <span class="sq" style="--c: #fc4c02"><ion-icon :icon="STRAVA_ICON" /></span>
          <div class="grow"><b>{{ strava.data.athlete.name || 'Strava' }}</b>
            <span>{{ strava.data.error ? 'Błąd: ' + strava.data.error : 'Dane z ' + stravaAgo + ' · ' + stravaCount + (stravaCount === 1 ? ' trening' : stravaCount % 10 >= 2 && stravaCount % 10 <= 4 && (stravaCount % 100 < 12 || stravaCount % 100 > 14) ? ' treningi' : ' treningów') + ' z tętnem' }}</span></div>
        </div>
        <button class="row" @click="refreshStrava" :disabled="strava.busy">
          <span class="sq" style="--c: #2f8cff"><ion-icon :icon="arrowDownOutline" /></span>
          <div class="grow"><b>Odśwież</b><span>Nowe dane pojawiają się co ~10 min</span></div>
        </button>
      </template>
      <div class="row" v-else-if="sst === 'waiting'">
        <span class="sq" style="--c: #fc4c02"><ion-icon :icon="STRAVA_ICON" /></span>
        <div class="grow"><b>Łączenie ze Stravą…</b><span>Potrwa do ~10 minut. Możesz zamknąć apkę.</span></div>
      </div>
      <template v-else>
        <button class="row" @click="connectStrava">
          <span class="sq" style="--c: #fc4c02"><ion-icon :icon="STRAVA_ICON" /></span>
          <div class="grow"><b>{{ sst === 'error' ? 'Połącz Stravę ponownie' : 'Połącz ze Stravą' }}</b>
            <span>{{ sst === 'error' ? strava.data.authError : 'Tętno i kalorie z zegarka przy treningach' }}</span></div>
          <ion-icon :icon="chevronForward" class="chev" />
        </button>
        <button class="row" @click="pasteCode">
          <span class="sq" style="--c: #8e8e93"><ion-icon :icon="clipboardOutline" /></span>
          <div class="grow"><b>Wklej kod</b><span>Gdy Strava otworzyła się w Safari</span></div>
        </button>
      </template>
    </div>
    <p class="section-foot" v-if="sst === 'on'">Ćwiczenia z apki dopisują się też do opisu treningu na Stravie.</p>
    <div class="ios-group gap" v-if="sst === 'on' || sst === 'waiting'">
      <button class="row danger" @click="askStravaOff"><div class="grow"><b>Odłącz Stravę</b></div></button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { IonIcon } from '@ionic/vue'
import { arrowDownOutline, chevronForward, clipboardOutline } from 'ionicons/icons'
import { ask } from '../../dialog'
import { cloud } from '../../cloud'
import { strava, status, startConnect, sendCode, pull, disconnectStrava, STRAVA_ICON } from '../../strava'
import { useNow, agoMin } from './now'

const emit = defineEmits(['msg'])
const say = m => emit('msg', m)
const now = useNow()
const sst = computed(() => status())
const stravaCount = computed(() => Object.values(strava.data?.acts || {}).filter(a => a.session && a.hr).length)
const stravaAgo = computed(() => (strava.data?.at ? agoMin(Date.parse(strava.data.at), now.value) : '–'))

async function connectStrava() {
  if (!cloud.token) { say('Najpierw połącz kopię z GitHub (Kopia zapasowa)'); return }
  const { role, value } = await ask({ icon: STRAVA_ICON, color: '#fc4c02', title: 'Połącz ze Stravą',
    message: 'Wpisz Client ID z ustawień API na Stravie (strava.com/settings/api). Potem kliknij „Zezwól”.',
    input: { type: 'text', placeholder: 'Client ID, np. 123456', value: strava.clientId },
    buttons: [{ text: 'Dalej do Stravy', role: 'ok', kind: 'primary' }, { text: 'Anuluj', role: 'cancel' }] })
  if (role !== 'ok' || !/^\d+$/.test(value)) { if (role === 'ok') say('Client ID to same cyfry'); return }
  startConnect(value)
}
async function pasteCode() {
  if (!cloud.token) { say('Najpierw połącz kopię z GitHub (Kopia zapasowa)'); return }
  const { role, value } = await ask({ icon: clipboardOutline, color: '#fc4c02', title: 'Wklej kod ze Stravy',
    message: 'Kod skopiowany w Safari po kliknięciu „Zezwól”.', input: { type: 'text', placeholder: 'kod' },
    buttons: [{ text: 'Połącz', role: 'ok', kind: 'primary' }, { text: 'Anuluj', role: 'cancel' }] })
  if (role !== 'ok' || !value) return
  await sendCode(value.replace(/.*[?&]code=([^&]+).*/, '$1'))
  say(strava.msg)
}
async function refreshStrava() { await pull(); say(strava.data?.error ? 'Strava: ' + strava.data.error : 'Odświeżono') }
async function askStravaOff() {
  const { role } = await ask({ icon: STRAVA_ICON, color: '#fc4c02', title: 'Odłączyć Stravę?',
    message: 'Apka przestanie pobierać tętno. Treningi w apce i na Stravie zostają.',
    buttons: [{ text: 'Odłącz', role: 'off', kind: 'danger' }, { text: 'Anuluj', role: 'cancel' }] })
  if (role !== 'off') return
  try { await disconnectStrava(); say('Strava odłączona') } catch (e) { say(e.message || 'Brak internetu') }
}
</script>
