<template>
  <Teleport to="body">
    <Transition name="dlg">
      <div v-if="dialog.open && o" class="dlg-wrap" :style="{ '--dc': o.color || 'var(--accent)' }" @click.self="closeDialog('cancel')">
        <div class="dlg" role="alertdialog" aria-modal="true" :aria-label="o.title">
          <div v-if="o.icon" class="dlg-ico" :class="{ danger: isDanger }"><ion-icon :icon="o.icon" /></div>
          <h2>{{ o.title }}</h2>
          <p v-if="o.message">{{ o.message }}</p>
          <textarea v-if="o.input?.multi" ref="inp" class="dlg-in dlg-ta" v-model="dialog.value" :placeholder="o.input.placeholder" rows="5"
            autocomplete="off" autocapitalize="off" spellcheck="false" />
          <input v-else-if="o.input" ref="inp" :inputmode="o.input.mode" class="dlg-in" v-model="dialog.value" :type="o.input.type || 'text'" :placeholder="o.input.placeholder"
            autocomplete="off" autocapitalize="off" spellcheck="false" @keyup.enter="closeDialog(main?.role || 'ok')" />
          <div v-for="c in o.choices || []" :key="c.key" class="dlg-ch">
            <span class="dlg-ch-l">{{ c.label }}</span>
            <div class="dlg-chips">
              <button v-for="op in c.options" :key="op.value" class="dlg-chip press" :class="{ on: dialog.picks[c.key] === op.value }"
                :aria-pressed="dialog.picks[c.key] === op.value" @click="dialog.picks[c.key] = op.value">
                <b>{{ op.label }}</b><small v-if="op.sub">{{ op.sub }}</small>
              </button>
            </div>
          </div>
          <div class="dlg-btns">
            <button v-for="b in btns" :key="b.role" class="dlg-btn press" :class="b.kind || 'plain'" @click="closeDialog(b.role)">{{ b.text }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import { dialog, closeDialog } from '../dialog'

const o = computed(() => dialog.opts)
const btns = computed(() => o.value?.buttons || [{ text: 'OK', role: 'ok', kind: 'primary' }])
const main = computed(() => btns.value.find(b => b.kind === 'primary' || b.kind === 'danger'))
const isDanger = computed(() => btns.value.some(b => b.kind === 'danger'))
const inp = ref(null)
watch(() => dialog.open, async v => { if (v && o.value?.input) { await nextTick(); setTimeout(() => inp.value?.focus(), 250) } })
</script>

<style scoped>
.dlg-wrap { position: fixed; inset: 0; z-index: 100000; display: flex; align-items: flex-end; justify-content: center;
  padding: 0 10px calc(10px + env(safe-area-inset-bottom)); background: rgba(0, 0, 0, .38);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.dlg { width: 100%; max-width: 440px; background: var(--app-card); color: var(--ion-text-color); border-radius: 28px;
  padding: 26px 18px 14px; display: flex; flex-direction: column; align-items: center; text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, .3); }
.dlg-ico { width: 56px; height: 56px; border-radius: 18px; display: grid; place-items: center; font-size: 28px; margin-bottom: 14px;
  color: var(--dc); background: color-mix(in srgb, var(--dc) 15%, transparent); }
.dlg-ico.danger { color: var(--app-bad); background: color-mix(in srgb, var(--app-bad) 14%, transparent); }
h2 { margin: 0 8px; font-size: 21px; font-weight: 700; letter-spacing: -.3px; line-height: 1.2; }
p { margin: 8px 8px 0; color: var(--app-muted); font-size: 15px; line-height: 1.4; white-space: pre-line; }
.dlg-in { width: 100%; margin-top: 16px; height: 48px; border: 0; border-radius: 14px; background: var(--app-field); color: inherit;
  padding: 0 14px; font: inherit; font-size: 16px; outline: none; }
.dlg-in:focus { box-shadow: inset 0 0 0 2px var(--dc); }
.dlg-ch { width: 100%; margin-top: 16px; text-align: left; }
.dlg-ch-l { display: block; margin: 0 4px 6px; font-size: 13px; color: var(--app-muted); }
.dlg-chips { display: flex; gap: 5px; }
.dlg-chip { flex: 1 1 0; min-width: 0; min-height: 44px; padding: 5px 2px; border: 0; border-radius: 12px; background: var(--app-field); color: var(--ion-text-color);
  font: inherit; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.15; }
.dlg-chip b { font-size: 15px; font-weight: 600; }
.dlg-chip small { font-size: 11.5px; color: var(--app-muted); }
.dlg-chip.on { background: var(--dc); color: #fff; }
.dlg-chip.on small { color: rgba(255, 255, 255, .8); }
.dlg-btns { width: 100%; display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }
.dlg-btn { height: 52px; border: 0; border-radius: 16px; font: inherit; font-size: 17px; font-weight: 600; }
.dlg-btn.primary { background: var(--dc); color: #fff; }
.dlg-btn.danger { background: var(--app-bad); color: #fff; }
.dlg-btn.soft { background: color-mix(in srgb, var(--dc) 14%, transparent); color: var(--dc); }
.dlg-btn.plain { background: var(--app-field); color: var(--ion-text-color); font-weight: 500; }
.dlg-btn:active { opacity: .7; }

.dlg-enter-active, .dlg-leave-active { transition: opacity .22s ease; }
.dlg-enter-active .dlg, .dlg-leave-active .dlg { transition: transform .32s cubic-bezier(.2, .9, .3, 1.15); }
.dlg-leave-active .dlg { transition-timing-function: ease-in; transition-duration: .2s; }
.dlg-enter-from, .dlg-leave-to { opacity: 0; }
.dlg-enter-from .dlg, .dlg-leave-to .dlg { transform: translateY(110%); }
@media (prefers-reduced-motion: reduce) { .dlg-enter-from .dlg, .dlg-leave-to .dlg { transform: none; } }
.dlg-ta { resize: none; min-height: 120px; font-size: 16px; line-height: 1.4; text-align: left; font-family: inherit; }
</style>
