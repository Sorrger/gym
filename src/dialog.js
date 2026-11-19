import { reactive } from 'vue'

// One custom dialog for the whole app (replaces Ionic alerts).
// ask({ icon, color, title, message, input, buttons: [{ text, role, kind: 'primary'|'danger'|'plain' }] })
// resolves to { role, value }; tapping outside or "Anuluj" gives role 'cancel'.
export const dialog = reactive({ open: false, opts: null, value: '', _res: null })

export function ask(opts) {
  if (dialog._res) dialog._res({ role: 'cancel' })
  dialog.opts = opts
  dialog.value = ''
  dialog.open = true
  return new Promise(res => { dialog._res = res })
}
export function closeDialog(role) {
  const res = dialog._res
  dialog._res = null
  dialog.open = false
  res?.({ role, value: dialog.value.trim() })
}
