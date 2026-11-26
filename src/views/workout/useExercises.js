// Changing the exercise list of one workout: swap a busy machine, notes per exercise, exercises added on the spot, supersets
import { computed, ref, nextTick } from 'vue'
import { swapHorizontal, createOutline, add, trashOutline, linkOutline } from 'ionicons/icons'
import { prefs } from '../../prefs'
import { altOf, nameIn, groupsOf } from '../../plan'
import { state, swapExercise, addExtra, removeExtra, noteFor, setNote, partnerOf, setSuperset } from '../../store'
import { custom } from '../../customPlan'
import { ask } from '../../dialog'

/** @param {{ s: any, exList: any, idx: any, exName: any, planName: any, groups: any, color: any, note: any, dir: any, tips: any }} ctx */
export function useExercises(ctx) {
  const { s, exList, idx, exName, planName, groups, color, note, dir, tips } = ctx
  const { sugList, showTip, autoSet } = tips
  // alternatives for a busy machine (ALT in plan.js): the plan's exercise first
  // alternatives already done at another place of this workout are left out (two places can't share one exercise)
  const swapOpts = computed(() => {
    if (!planName.value) return []
    const taken = new Set(exList.value.filter((e, i) => i !== idx.value).flatMap(e => [e[0], nameIn(e, s.value)]))
    return [planName.value, ...altOf(planName.value).filter(n => !taken.has(n))]
  })
  async function swapAsk() {
    const sess = s.value, cur = exName.value
    if (groups.value.some(g => (sess.ex[g.key] || []).some(x => x.d))) {
      await ask({ icon: swapHorizontal, color: color.value, title: 'Masz już zaliczone serie', message: `Żeby zamienić ćwiczenie, najpierw odznacz serie ${cur}.`, buttons: [{ text: 'OK', role: 'ok', kind: 'primary' }] })
      return
    }
    const { role } = await ask({ icon: swapHorizontal, color: color.value, title: 'Zamień ćwiczenie',
      message: 'Zrób to, co jest wolne. Każde ćwiczenie ma swoją historię i swoje podpowiedzi ciężaru.',
      buttons: [...swapOpts.value.map((n, k) => ({ text: (n === cur ? '✓ ' : '') + n + (k === 0 ? ' (z planu)' : ''), role: n, kind: n === cur ? 'soft' : 'primary' })), { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
    if (role === 'cancel' || role === cur || !swapOpts.value.includes(role)) return
    swapExercise(sess, planName.value, role)
    state.flash = 'Dziś: ' + role
    await nextTick(); const l = sugList(); if (l.length && prefs.coach === 'auto') showTip(l); else if (l.length && prefs.coach === 'set') autoSet(l)
  }
  // ---------- notes ----------
  const exNote = computed(() => { void state.sessions; return s.value ? noteFor(exName.value, s.value) : { text: '', own: false, date: '' } })
  async function editNote() {
    const { role, value } = await ask({ icon: createOutline, color: color.value, title: 'Notatka · ' + exName.value,
      message: 'Np. ustawienie siedzenia, chwyt, na co uważać. Pokaże się przy następnych treningach.',
      input: { value: exNote.value.text, placeholder: 'Np. siedzenie na 4, łokcie bliżej', multi: true },
      buttons: [{ text: 'Zapisz', role: 'ok', kind: 'primary' }, ...(exNote.value.text ? [{ text: 'Usuń notatkę', role: 'clear', kind: 'danger' }] : []), { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
    if (role === 'ok') setNote(s.value, exName.value, value)
    else if (role === 'clear') setNote(s.value, exName.value, '')
  }
  // ---------- add an exercise during the workout ----------
  // the catalogue loads on first use; the sheet opens once it is there
  const addOpen = ref(false), addReady = ref(false)
  async function openAdd() {
    if (!addReady.value) { addReady.value = true; await import('../ExercisePicker.vue'); await nextTick(); await new Promise(r => setTimeout(r, 50)) }
    addOpen.value = true
  }
  const ownList = computed(() => Object.entries(custom.data?.own || {}).map(([id, o]) => ({ id, ...o })))
  async function addPicked(r) {
    const sess = s.value
    if (!addExtra(sess, r)) {
      await ask({ icon: add, color: color.value, title: 'To ćwiczenie już jest w treningu', message: `„${r.name}” jest już w tym treningu. Wybierz inne albo zmień opcje.`, buttons: [{ text: 'OK', role: 'ok', kind: 'primary' }] })
      return
    }
    dir.value = 'next'; sess.cur = exList.value.length - 1
    note.value = 'Dodano: ' + r.name
  }
  async function dropExtra() {
    const name = exName.value
    if (!removeExtra(s.value, idx.value)) {
      await ask({ icon: trashOutline, color: color.value, title: 'Masz już zaliczone serie', message: `Żeby usunąć ${name} z treningu, najpierw odznacz jego serie.`, buttons: [{ text: 'OK', role: 'ok', kind: 'primary' }] })
      return
    }
    note.value = 'Usunięto: ' + name
  }
  // ---------- supersets ----------
  const partner = computed(() => (s.value ? partnerOf(s.value, idx.value) : null))
  const hasOpen = i => groupsOf(exList.value[i], s.value).some(g => (s.value.ex[g.key] || []).some(x => !x.d))
  const ssSide = i => { const p = s.value ? partnerOf(s.value, i) : null; return p == null ? '' : p > i ? 'l' : 'r' }
  async function ssAsk() {
    const i = idx.value, sess = s.value
    const free = exList.value.map((e, j) => j).filter(j => j !== i && (partnerOf(sess, j) == null || partnerOf(sess, j) === i))
    const { role } = await ask({ icon: linkOutline, color: color.value, title: 'Superseria',
      message: 'Dwa ćwiczenia na zmianę: seria jednego, od razu seria drugiego, potem przerwa. Apka sama przeskakuje między nimi.',
      buttons: [...free.map(j => ({ text: (partner.value === j ? '✓ ' : '') + (j + 1) + '. ' + nameIn(exList.value[j], sess), role: 'j' + j, kind: partner.value === j ? 'soft' : 'primary' })),
        ...(partner.value != null ? [{ text: 'Rozłącz superserię', role: 'off', kind: 'danger' }] : []), { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
    if (role === 'off') { setSuperset(sess, i, null); note.value = 'Superseria rozłączona' }
    else if (role?.startsWith('j')) { const j = +role.slice(1); if (j !== partner.value) { setSuperset(sess, i, j); note.value = 'Superseria: ' + (Math.min(i, j) + 1) + ' + ' + (Math.max(i, j) + 1) } }
  }
  return { swapOpts, swapAsk, exNote, editNote, addOpen, addReady, openAdd, ownList, addPicked, dropExtra, partner, hasOpen, ssSide, ssAsk }
}
