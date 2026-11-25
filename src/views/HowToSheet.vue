<!-- "Jak to zrobić": small sheet with the exercise animation (when there is one), the muscles and short technique cues.
     The catalogue and the scenes load only when the sheet opens. -->
<template>
  <ion-modal :is-open="open" :initial-breakpoint="1" :breakpoints="[0, 1]" class="howto-sheet" :style="{ '--c': color }" @didDismiss="emit('close')">
    <div class="ht">
      <div class="ht-head">
        <b data-no-tr>{{ title }}</b>
        <button class="ht-x press" @click="emit('close')" aria-label="Zamknij"><ion-icon :icon="close" /></button>
      </div>
      <template v-if="parts.length">
        <p class="ht-stage">{{ stageLine }}</p>
        <div v-if="parts.length > 1" class="ht-parts">
          <button v-for="(p, i) in parts" :key="p.label" class="ht-part press" :class="{ on: i === pi }" @click="pick(i)">{{ p.label }}</button>
        </div>
      </template>
      <ExerciseAnim v-if="scene" :key="name + pi" :scene="scene" :label="'Animacja: ' + name" />
      <div class="ht-mus">
        <span v-if="muscles.main.length"><i class="dot"></i>{{ muscles.main.map(m => MUSCLE_NAMES[m]).join(', ') }}</span>
        <span v-if="muscles.help.length"><i class="dot h"></i>{{ muscles.help.map(m => MUSCLE_NAMES[m]).join(', ') }}</span>
      </div>
      <ol v-if="cues.length" class="ht-cues" data-no-tr><li v-for="c in cues" :key="c">{{ c }}</li></ol>
      <p v-else-if="loaded" class="ht-none">Dla tego ćwiczenia nie ma jeszcze opisu techniki.</p>
      <p v-if="loaded && !scene && cues.length" class="ht-soon">Animacja tego ćwiczenia będzie wkrótce.</p>
    </div>
  </ion-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { IonModal, IonIcon } from '@ionic/vue'
import { close } from 'ionicons/icons'
import { MUSCLE_NAMES } from '../muscles'
import { lang } from '../i18n'
import ExerciseAnim from './ExerciseAnim.vue'
import { PULLUP, PULLUP_STAGES } from '../plan'
import { pullupStage } from '../store'

const props = defineProps({ open: Boolean, name: { type: String, default: '' }, part: { type: String, default: '' }, color: String,
  muscles: { type: Object, default: () => ({ main: [], help: [] }) } })
const emit = defineEmits(['close'])
/** @type {import('vue').Ref<any>} */
const scene = ref(null)
/** @type {import('vue').Ref<string[]>} */
const cues = ref([])
const loaded = ref(false), title = ref('')
// multi-part exercise (pull-up learning): one animation + cues per part
const parts = ref([]), pi = ref(0), stageLine = ref('')
function pick(i) { pi.value = i; scene.value = parts.value[i].scene; cues.value = parts.value[i].scene?.cues?.[lang !== 'pl' ? 'en' : 'pl'] || [] }
watch(() => [props.open, props.name], async ([o]) => {
  if (!o) return
  loaded.value = false; scene.value = null; cues.value = []; title.value = props.name; parts.value = []; pi.value = 0
  const [{ byName, compose }, { sceneFor, pullupPart }] = await Promise.all([import('../catalog'), import('../anim/scenes')])
  if (props.name === PULLUP) {
    const st = PULLUP_STAGES[pullupStage() - 1] || PULLUP_STAGES[0]
    stageLine.value = `Etap ${st.n}/4 · ${st.title}`
    parts.value = st.parts.map(p => ({ label: p.label, scene: pullupPart(p.label) }))
    pick(Math.max(0, parts.value.findIndex(p => p.label === props.part)))
    loaded.value = true
    return
  }
  const c = byName(props.name)
  if (c) {
    const comp = compose(c.base, c.sel)
    const sc = sceneFor(c.base.id, c.sel, { main: comp.main, help: comp.help })
    scene.value = sc
    const en = lang !== 'pl'
    cues.value = sc?.cues ? sc.cues[en ? 'en' : 'pl'] : c.base.how ? [c.base.how[en ? 1 : 0]] : []
    if (en) title.value = comp.nameEn || props.name
  }
  loaded.value = true
}, { immediate: true })
const muscles = computed(() => ({ main: props.muscles.main || [], help: props.muscles.help || [] }))
</script>

<style>
/* moved out of the page when open: not scoped */
.howto-sheet { --height: auto; --background: var(--app-bg); --border-radius: 22px; }
.howto-sheet .ht { padding: 14px 16px calc(20px + env(safe-area-inset-bottom, 0px)); }
.howto-sheet .ht-stage { margin: -4px 0 8px; font-size: 14px; color: var(--app-muted); }
.howto-sheet .ht-parts { display: flex; gap: 6px; margin-bottom: 10px; }
.howto-sheet .ht-part { border: 0; border-radius: 999px; padding: 6px 12px; font-size: 14px; font-weight: 600; background: var(--app-card-2); color: var(--app-text); }
.howto-sheet .ht-part.on { background: var(--c, var(--accent)); color: #fff; }
.howto-sheet .ht-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.howto-sheet .ht-head b { flex: 1; font-size: 18px; line-height: 1.25; }
.howto-sheet .ht-x { width: 32px; height: 32px; flex: none; border: 0; border-radius: 50%; background: var(--app-field); color: var(--ion-text-color); display: grid; place-items: center; font-size: 17px; }
.howto-sheet .ht-mus { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 12px 2px 6px; font-size: 14px; color: var(--app-muted); }
.howto-sheet .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; background: var(--c); }
.howto-sheet .dot.h { opacity: .4; }
.howto-sheet .ht-cues { margin: 6px 0 0; padding-left: 22px; font-size: 15px; line-height: 1.55; }
.howto-sheet .ht-none, .howto-sheet .ht-soon { margin: 8px 2px 0; font-size: 14px; color: var(--app-muted); }
</style>
