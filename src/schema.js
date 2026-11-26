// Shapes of the stored records, so a database (and older app versions from the stores) can read them.
// Rule: a record without `v` is version 1; bump the number when the shape changes and upgrade old
// records here (one-way, tolerant: unknown fields are kept). See DATA_MODEL.md.
import { PLAN, stampIds } from './plan'

export const V = {
  session: 2, // 2 = has `plan` (training key) and `xid` (exercise ids); weights always in kg
  plan: 2, // 2 = own exercises / ids / renames
  profile: 1,
  weight: 1,
  measure: 1
}

// unique across phones and accounts: start time + random tail
export function newId(t = Date.now()) {
  const A = '0123456789abcdefghijklmnopqrstuvwxyz'
  let b
  try { b = crypto.getRandomValues(new Uint8Array(6)) } catch { b = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256)) }
  return t.toString(36) + '-' + Array.from(b, x => A[x % 36]).join('')
}

// upgrades a workout in place; returns true when something was added
export function normSession(s) {
  if (!s || typeof s !== 'object') return false
  let ch = false
  if (s.plan == null && !s.offApp) {
    const t = PLAN[+s.day]
    if (t?.key && !t.hidden) { s.plan = t.key; ch = true }
  }
  if (stampIds(s)) ch = true
  if ((s.v || 1) < V.session) { s.v = V.session; ch = true }
  return ch
}
