<template>
  <ion-page>
    <div class="mini-bar" :class="{ on: scrolled }" aria-hidden="true"><span>Profil</span></div>
    <ion-content :fullscreen="true" :scroll-events="true" @ionScroll="onScroll">
      <header class="big-head">
        <h1 class="t-large">Profil</h1>
      </header>
      <div class="page">

        <!-- who: nickname now, a real account later -->
        <button class="tab-banner me press" @click="editNick">
          <span class="avatar"><template v-if="account.nick">{{ initials(account.nick) }}</template><ion-icon v-else :icon="person" /></span>
          <div class="grow">
            <b>{{ account.nick || 'Dodaj swój nick' }}</b>
            <span>{{ since ? 'Trenujesz od ' + since + ' · ' + ov.workouts + ' ' + (ov.workouts === 1 ? 'trening' : ov.workouts % 10 >= 2 && ov.workouts % 10 <= 4 && (ov.workouts % 100 < 10 || ov.workouts % 100 >= 20) ? 'treningi' : 'treningów') : 'Pierwszy trening przed Tobą' }}</span>
          </div>
          <ion-icon :icon="createOutline" class="edit" />
        </button>

        <h3 class="section-title">Konto</h3>
        <div class="ios-group">
          <div class="row">
            <span class="r-ico" style="--c: #8e8e93"><ion-icon :icon="phonePortraitOutline" /></span>
            <div class="grow"><b>Konto lokalne</b><span>Dane są na tym telefonie{{ cloud.token ? ' + kopia na GitHubie' : '' }}</span></div>
          </div>
          <button v-for="p in PROVIDERS" :key="p.id" class="row press" @click="login(p.id)">
            <span class="r-ico g-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#34a853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#fbbc05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z"/><path fill="#ea4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 5.9 12 5.9z"/></svg></span>
            <div class="grow"><b>Zaloguj przez {{ p.name }}</b><span>Treningi na kilku telefonach, bez tokenów</span></div>
            <span v-if="!p.ready" class="soon">Wkrótce</span>
          </button>
        </div>

        <h3 class="section-title">Aplikacja</h3>
        <div class="ios-group">
          <button class="row press" @click="router.push('/settings')">
            <span class="r-ico" style="--c: #636366"><ion-icon :icon="settingsOutline" /></span>
            <div class="grow"><b>Ustawienia</b><span>Wygląd, kopia danych, Strava</span></div>
            <span v-if="backupWarn" class="dot-warn" aria-label="Kopia nie działa"></span>
            <ion-icon :icon="chevronForward" class="chev" />
          </button>
        </div>
        <p class="section-foot">Inch Up · Twoje dane zostają u Ciebie</p>
      </div>
      <ion-toast :is-open="!!toast" :message="t(toast)" :duration="3500" position="top" @didDismiss="toast = ''" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { t } from '../i18n'
import { useScrolled } from '../useScrolled'
import { ref, computed } from 'vue'
import { IonPage, IonContent, IonIcon, IonToast, useIonRouter } from '@ionic/vue'
import { createOutline, chevronForward, phonePortraitOutline, settingsOutline, person } from 'ionicons/icons'
import { state, doneSessions, fmtDate } from '../store'
import { overview } from '../stats'
import { cloud } from '../cloud'
import { account, setNick, initials, PROVIDERS, signIn } from '../account'
import { ask } from '../dialog'

const { scrolled, onScroll } = useScrolled()
const router = useIonRouter()
const toast = ref('')
const ov = computed(() => { void state.sessions; return overview(null) })
const since = computed(() => { const l = doneSessions(); return l.length ? fmtDate(l[l.length - 1].date) : '' })
const backupWarn = computed(() => cloud.token && cloud.error && cloud.error !== 'Brak połączenia')

async function editNick() {
  const { role, value } = await ask({ icon: createOutline, title: 'Twój nick', message: 'Jak mamy Cię nazywać? Widać go tylko u Ciebie – później posłuży do konta.',
    input: { value: account.nick, placeholder: 'np. Sorrger' },
    buttons: [{ text: 'Zapisz', role: 'ok', kind: 'primary' }, { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (role === 'ok') setNick(value)
}
async function login(id) { toast.value = (await signIn(id)).message }
</script>

<style scoped>
.r-ico { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; flex: none; color: #fff; background: var(--c); font-size: 18px; }
.row .grow b { font-size: 16px; font-weight: 600; }
.chev { color: var(--app-faint); font-size: 18px; }
.me { display: flex; align-items: center; gap: 14px; padding: 18px 16px; }
.avatar { width: 68px; height: 68px; border-radius: 50%; flex: none; display: grid; place-items: center; color: var(--accent); font-size: 23px; font-weight: 800; letter-spacing: .5px; font-family: var(--num-font);
  background: color-mix(in srgb, var(--accent) 22%, transparent); }
.avatar ion-icon { font-size: 30px; }
.me .grow { display: flex; flex-direction: column; min-width: 0; }
.me b { font-size: 24px; font-family: var(--num-font); font-weight: 700; letter-spacing: -.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.me span { font-size: 14px; color: var(--app-muted); margin-top: 2px; }
.me .edit { font-size: 21px; color: var(--accent); flex: none; }
.g-ico { background: #fff !important; box-shadow: inset 0 0 0 0.5px var(--app-line); }
.g-ico svg { width: 18px; height: 18px; }
.soon { flex: none; font-size: 12px; font-weight: 600; color: var(--app-muted); background: var(--app-field); padding: 4px 9px; border-radius: 999px; }
.dot-warn { width: 9px; height: 9px; border-radius: 50%; background: var(--app-bad); flex: none; }
</style>
