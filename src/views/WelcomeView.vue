<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="wel">
        <div class="dots" aria-hidden="true"><i v-for="k in 4" :key="k" :class="{ on: step >= k - 1 }"></i></div>

        <!-- 1: language -->
        <section v-if="step === 0" class="st" data-no-tr>
          <img class="logo" src="/icon-192.png" alt="" />
          <h1>Inch Up</h1>
          <p class="lead">Wybierz język · Choose your language</p>
          <button v-for="(l, k) in LANGS" :key="k" class="big press" :class="{ on: cur === k }" @click="pick(k)"><span class="flag">{{ k.toUpperCase() }}</span><b>{{ l.name }}</b></button>
        </section>

        <!-- 2: what interests you (features you don't want stay off) -->
        <section v-else-if="step === 1" class="st">
          <h1>Co Cię interesuje?</h1>
          <p class="lead">Zaznacz, czego chcesz używać. Resztę schowam – zmienisz to później w Ustawieniach.</p>
          <div class="ints">
            <button v-for="f in FEATS" :key="f.k" class="int press" role="switch" :aria-checked="want[f.k]" @click="want[f.k] = !want[f.k]">
              <div class="grow"><b>{{ f.t }}</b><span>{{ f.d }}</span></div>
              <span class="sw-t" :class="{ on: want[f.k] }"><i></i></span>
            </button>
          </div>
        </section>

        <!-- 3: account -->
        <section v-else-if="step === 2" class="st">
          <h1>Twoje konto</h1>
          <p class="lead">Dane zostają na tym telefonie. Logowanie i kopia w chmurze – wkrótce.</p>
          <label class="fld"><span>Nick</span><input v-model="nick" maxlength="24" placeholder="np. Kuba" autocomplete="nickname" /></label>
          <template v-if="want.weightOn">
          <div class="fld"><span>Cel</span>
            <div class="seg3"><button v-for="g in GOALS" :key="g.v" class="press" :class="{ on: goal === g.v }" @click="goal = g.v">{{ g.t }}</button></div>
          </div>
          <label class="fld"><span>Waga dziś (kg, opcjonalnie)</span><input v-model="kg" inputmode="decimal" placeholder="np. 82,5" /></label>
          </template>
          <div class="or"><span>albo</span></div>
          <button class="soc press" @click="soon('Google')"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#34a853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#fbbc05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z"/><path fill="#ea4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 5.9 12 5.9z"/></svg>Kontynuuj z Google<small>wkrótce</small></button>
          <button class="soc press" @click="soon('Apple')"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.5 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9a4.9 4.9 0 0 0-4.1 2.5c-1.8 3.1-.5 7.6 1.3 10.1.8 1.2 1.8 2.6 3.1 2.5 1.3 0 1.7-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.2-1.2 3-2.4a10 10 0 0 0 1.4-2.8 4.3 4.3 0 0 1-2.7-4.2zM13.9 5.2c.7-.8 1.2-2 1-3.2-1 .1-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3.1 1.1.1 2.2-.6 2.9-1.4z"/></svg>Kontynuuj z Apple<small>wkrótce</small></button>
        </section>

        <!-- 4: ready -->
        <section v-else class="st">
          <h1>{{ nick ? 'Gotowe, ' + nick + '!' : 'Gotowe!' }}</h1>
          <p class="lead">Na start masz plan podstawowy: {{ planNames }}. Zmienisz go w Trening → Edytuj plan – ćwiczenia, dni, ile chcesz treningów.</p>
          <div class="tips">
            <p><b>Podpowiedzi</b> – apka sama mówi, kiedy dodać ciężar.</p>
            <p><b>Ustawienia</b> – Profil → Ustawienia: zasady progresji, lżejszy tydzień, motyw, język.</p>
            <p><b>Bez internetu</b> – wszystko działa na siłowni bez zasięgu.</p>
          </div>
        </section>

        <div class="foot">
          <button v-if="step > 0" class="back press" @click="step--">Wstecz</button>
          <button class="next press" @click="next">{{ step === 3 ? 'Zaczynamy' : 'Dalej' }}</button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { IonPage, IonContent, useIonRouter } from '@ionic/vue'
import { lang, setLang, LANGS } from '../i18n'
import { setNick, setPref } from '../account'
import { setWeight } from '../weight'
import { iso } from '../store'
import { PLAN } from '../plan'
import { ask } from '../dialog'

const router = useIonRouter()
const step = ref((() => { try { return +sessionStorage.getItem('welStep') || 0 } catch { return 0 } })())
const cur = ref(lang)
const nick = ref(''), goal = ref('cut'), kg = ref('')
// interview: new users choose the features; what they don't want is switched off (Ustawienia can bring it back)
const FEATS = [
  { k: 'weightOn', t: 'Waga i sylwetka', d: 'Zapisywanie wagi, tempo, cel' },
  { k: 'coach', t: 'Podpowiedzi trenera', d: 'Ile dźwignąć dziś, kiedy dodać ciężar' },
  { k: 'restTimer', t: 'Minutnik przerwy', d: 'Odlicza przerwę po każdej serii' },
  { k: 'warmup', t: 'Rozgrzewka', d: 'Serie rozgrzewkowe przy sztandze' },
  { k: 'rir', t: 'Zapas powtórzeń', d: 'Ile zostało do upadku – dla dokładniejszych podpowiedzi' },
  { k: 'deload', t: 'Lżejszy tydzień', d: 'Co kilka tygodni lżej, żeby odpocząć' },
  { k: 'setTypes', t: 'Rodzaje serii', d: 'Rozgrzewkowa, drop set, do upadku' }]
const want = reactive({ weightOn: true, coach: true, restTimer: true, warmup: true, rir: false, deload: true, setTypes: false })
const GOALS = [{ v: 'cut', t: 'Redukcja' }, { v: 'maintain', t: 'Utrzymanie' }, { v: 'bulk', t: 'Masa' }]
const planNames = computed(() => PLAN.filter(p => !p.hidden).map(p => p.name).join(', '))

// another language than the page has now → reload into it (texts are translated while the page is built), go on at step 2
function pick(l) {
  cur.value = l
  if (l !== lang) { try { sessionStorage.setItem('welStep', '1') } catch {} setLang(l, true); return }
  setLang(l, false); step.value = 1
}
function soon(p) { ask({ title: 'Logowanie przez ' + p, message: 'Będzie wkrótce. Na razie załóż konto lokalne – dane przeniesiesz później jednym dotknięciem.', buttons: [{ text: 'OK', role: 'ok', kind: 'primary' }] }) }
function next() {
  if (step.value === 0) { pick(cur.value); return }
  if (step.value === 1) {
    setPref('weightOn', want.weightOn); setPref('coach', want.coach ? 'set' : 'off'); setPref('live', want.coach)
    for (const k of ['rir', 'warmup', 'restTimer', 'deload', 'setTypes']) setPref(k, want[k])
    step.value = 2; return
  }
  if (step.value === 2) {
    if (nick.value.trim()) setNick(nick.value)
    if (want.weightOn) {
      setPref('goal', goal.value)
      const w = parseFloat(String(kg.value).replace(',', '.'))
      if (w > 20 && w < 400) setWeight(iso(new Date()), w)
    }
    step.value = 3; return
  }
  try { localStorage.setItem('onboarded', '1'); sessionStorage.removeItem('welStep') } catch {}
  router.navigate('/tabs/home', 'root', 'replace')
}
</script>

<style scoped>
.wel { min-height: 100%; display: flex; flex-direction: column; padding: calc(env(safe-area-inset-top) + 18px) 22px calc(env(safe-area-inset-bottom) + 18px); }
.dots { display: flex; gap: 6px; justify-content: center; margin-bottom: 18px; }
.dots i { width: 22px; height: 5px; border-radius: 3px; background: var(--app-field); }
.dots i.on { background: var(--accent); }
.st { flex: 1; display: flex; flex-direction: column; }
.logo { width: 92px; height: 92px; border-radius: 22px; margin: 28px auto 10px; box-shadow: 0 10px 30px rgba(var(--accent-rgb), .35); }
h1 { font-size: 32px; font-weight: 800; letter-spacing: -.5px; margin: 8px 0 6px; text-align: center; }
.lead { text-align: center; color: var(--app-muted); font-size: 16px; line-height: 1.4; margin: 0 0 22px; }
.big { display: flex; align-items: center; gap: 14px; padding: 18px; margin-bottom: 12px; border: 2px solid transparent; border-radius: 18px; background: var(--app-card); font: inherit; font-size: 19px; color: inherit; text-align: left; }
.big.on { border-color: var(--accent); }
.flag { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; font-size: 15px; font-weight: 800; color: #fff; background: linear-gradient(145deg, var(--accent-2, var(--accent)), var(--accent)); }
.fld { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.fld > span { font-size: 14px; color: var(--app-muted); font-weight: 600; }
.fld input { font: inherit; font-size: 17px; padding: 13px 14px; border-radius: 12px; border: 0; background: var(--app-card); color: var(--ion-text-color); }
.seg3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; padding: 3px; border-radius: 12px; background: var(--app-field); }
.seg3 button { border: 0; padding: 10px 4px; border-radius: 9px; font: inherit; font-size: 15px; font-weight: 600; background: none; color: var(--ion-text-color); }
.seg3 button.on { background: var(--app-card); color: var(--accent); box-shadow: 0 1px 4px rgba(0,0,0,.12); }
.or { display: flex; align-items: center; gap: 10px; margin: 6px 0 12px; color: var(--app-muted); font-size: 13px; }
.or::before, .or::after { content: ''; flex: 1; height: 1px; background: var(--app-line); }
.soc { display: flex; align-items: center; gap: 10px; padding: 13px 16px; margin-bottom: 10px; border: 0; border-radius: 14px; background: var(--app-card); font: inherit; font-size: 16px; font-weight: 600; color: inherit; }
.soc svg { width: 20px; height: 20px; }
.soc small { margin-left: auto; font-size: 12px; color: var(--app-muted); background: var(--app-field); padding: 3px 8px; border-radius: 999px; font-weight: 600; }
.tips p { background: var(--app-card); border-radius: 14px; padding: 13px 15px; margin: 0 0 10px; font-size: 15px; line-height: 1.4; color: var(--app-muted); }
.tips b { color: var(--ion-text-color); }
.foot { display: flex; gap: 10px; margin-top: 16px; }
.foot button { flex: 1; padding: 16px; border: 0; border-radius: 16px; font: inherit; font-size: 17px; font-weight: 700; }
.next { background: var(--accent); color: #fff; flex: 2 !important; }
.back { background: var(--app-card); color: var(--accent); }
.ints { display: flex; flex-direction: column; background: var(--app-card); border-radius: 16px; overflow: hidden; }
.int { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 0; background: none; font: inherit; color: inherit; text-align: left; }
.int + .int { border-top: 0.5px solid var(--app-line); }
.int .grow { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.int b { font-size: 16px; font-weight: 600; }
.int span { font-size: 13px; color: var(--app-muted); }
.sw-t { width: 51px; height: 31px; border-radius: 999px; background: var(--app-field); position: relative; flex: none; transition: background .2s; }
.sw-t i { position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.2); transition: transform .2s; }
.sw-t.on { background: #34c759; }
.sw-t.on i { transform: translateX(20px); }
</style>
