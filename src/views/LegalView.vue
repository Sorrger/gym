<template>
  <ion-page>
    <div class="mini-bar" :class="{ on: scrolled }"><button class="mb-back press" @click="goBack" aria-label="Wróć"><ion-icon :icon="chevronBack" /></button><span data-no-tr>{{ docT.title }}</span></div>
    <ion-content :fullscreen="true" :scroll-events="true" @ionScroll="onScroll">
      <header class="big-head sub-page">
        <button class="back press" @click="goBack"><ion-icon :icon="chevronBack" /> Wróć</button>
        <h1 class="t-large" data-no-tr>{{ docT.title }}</h1>
        <p class="sub" data-no-tr>{{ lang === 'pl' ? 'Wersja z ' : 'Version of ' }}{{ LEGAL_DATE }}</p>
      </header>
      <div class="page" data-no-tr>
        <div class="card legal">
          <section v-for="(p, k) in docT.parts" :key="k">
            <h2>{{ p[0] }}</h2>
            <p>{{ p[1] }}</p>
          </section>
        </div>
        <div class="ios-group others">
          <button v-for="d in DOCS.filter(x => x !== doc)" :key="d" class="row press" @click="ionRouter.navigate('/legal/' + d, 'forward', 'replace')">
            <div class="grow"><b>{{ texts[d].title }}</b></div>
            <ion-icon :icon="chevronForward" class="chev" />
          </button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
// Privacy policy / terms / health note (texts in src/legal.js, both languages – the page itself is not run through the translator)
import { computed, ref, watch } from 'vue'
import { IonPage, IonContent, IonIcon, useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import { chevronBack, chevronForward } from 'ionicons/icons'
import { useScrolled } from '../useScrolled'
import { lang } from '../i18n'
import { LEGAL, LEGAL_DATE, DOCS } from '../legal'

const route = useRoute()
const ionRouter = useIonRouter()
const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate('/settings', 'back', 'replace'))
const { scrolled, onScroll } = useScrolled()
const doc = ref(DOCS.includes(String(route.params.doc)) ? String(route.params.doc) : 'privacy')
watch(() => route.params.doc, d => { if (DOCS.includes(String(d))) doc.value = String(d) })
const texts = computed(() => LEGAL[lang === 'pl' ? 'pl' : 'en'])
const docT = computed(() => texts.value[doc.value])
</script>

<style scoped>
.big-head.sub-page { padding-top: calc(env(safe-area-inset-top) + 6px); }
.back { display: inline-flex; align-items: center; gap: 2px; margin: 0 0 10px 10px; padding: 6px 8px; border: 0; background: none; font: inherit; font-size: 17px; color: var(--accent); }
.back ion-icon { font-size: 22px; }
.mb-back { position: absolute; left: 8px; bottom: 4px; width: 36px; height: 36px; border: 0; background: none; color: var(--accent); font-size: 24px; display: grid; place-items: center; pointer-events: auto; }
.mini-bar { pointer-events: none; }
.mini-bar.on .mb-back { pointer-events: auto; }
.legal section + section { margin-top: 16px; }
.legal h2 { font-size: 16px; font-weight: 700; margin: 0 0 4px; }
.legal p { margin: 0; font-size: 15px; line-height: 1.45; color: var(--ion-text-color); overflow-wrap: anywhere; }
.others { margin-top: 14px; }
.chev { color: var(--app-muted); }
</style>
