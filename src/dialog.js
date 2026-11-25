import { reactive } from 'vue'

// One custom dialog for the whole app (replaces Ionic alerts).
// ask({ icon, color, title, message, input, buttons: [{ text, role, kind: 'primary'|'danger'|'soft'|'plain' }] })
// resolves to { role, value, picks }; tapping outside or "Anuluj" gives role 'cancel'.
// choices: [{ key, label, value, options: [{ value, label, sub? }] }] = rows of chips, the picked values come back in picks[key]
export const dialog = reactive({ open: false, opts: null, value: '', picks: {}, _res: null })

export function ask(opts) {
  if (dialog._res) dialog._res({ role: 'cancel' })
  dialog.opts = opts
  dialog.value = opts.input?.value || ''
  dialog.picks = Object.fromEntries((opts.choices || []).map(c => [c.key, c.value]))
  dialog.open = true
  return new Promise(res => { dialog._res = res })
}
export function closeDialog(role) {
  const res = dialog._res
  dialog._res = null
  dialog.open = false
  res?.({ role, value: dialog.value.trim(), picks: { ...dialog.picks } })
}
