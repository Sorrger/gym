// CSV: every done set as one row (opens in Excel / Numbers / Google Sheets), and import of this file
// or of the exports of Strong and Hevy, so history can move between apps.
import { PLAN, visiblePlans, unitOfKey, exId, PULLUP } from './plan'

const HEAD = ['Date', 'Time', 'Workout', 'Exercise', 'Part', 'Set', 'Weight (kg)', 'Reps', 'Seconds', 'RIR', 'Set type', 'Exercise id', 'Workout id']
const TYPE = { w: 'warmup', d: 'dropset', f: 'failure' }
const TYPE_BACK = { warmup: 'w', 'warm up': 'w', dropset: 'd', 'drop set': 'd', failure: 'f' }

const q = v => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
const hhmm = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') }

/** all done sets of finished workouts, oldest first */
export function toCSV(sessions) {
  const rows = [HEAD.join(',')]
  const list = Object.values(sessions || {}).filter(s => s.finished && !s.offApp).sort((a, b) => a.date.localeCompare(b.date) || (a.started || 0) - (b.started || 0))
  for (const s of list) {
    const plan = PLAN[s.day]?.name || ''
    for (const [key, sets] of Object.entries(s.ex || {})) {
      const [name, ...part] = key.split(' · ')
      const unit = unitOfKey(key, sets)
      let n = 0
      for (const x of sets) {
        if (!x.d || x.w == null) continue
        n++
        const kg = unit === 'kg' ? x.w : '', reps = unit === 'kg' ? x.r ?? '' : unit === 'reps' ? x.w : '', sec = unit === 's' ? x.w : ''
        rows.push([s.date, s.started ? hhmm(s.started) : '', plan, name, part.join(' · '), n, kg, reps, sec, x.q ?? '', TYPE[x.t] || '', s.xid?.[key] || exId(key), s.id].map(q).join(','))
      }
    }
  }
  return rows.join('\n') + '\n'
}

/** split CSV text (comma or semicolon, quoted fields) into rows of cells */
export function parseCSV(text) {
  const src = String(text).replace(/^\uFEFF/, '')
  const first = src.split('\n')[0] || ''
  const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ','
  const rows = []; let row = [], cell = '', inQ = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQ) { if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++ } else inQ = false } else cell += c; continue }
    if (c === '"') inQ = true
    else if (c === sep) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(x => x !== '')) rows.push(row); row = [] }
    else cell += c
  }
  row.push(cell); if (row.some(x => x !== '')) rows.push(row)
  return rows
}

const num = v => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null }
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
/** '2026-11-26 18:03:00', '2026-11-26T18:03', '26 Nov 2026, 18:03' → local time in ms */
export function parseWhen(s) {
  const t = String(s || '').trim()
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0)).getTime()
  m = t.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4}),? ?(\d{1,2})?:?(\d{2})?/)
  if (m && MONTHS[m[2].toLowerCase()]) return new Date(+m[3], MONTHS[m[2].toLowerCase()] - 1, +m[1], +(m[4] || 12), +(m[5] || 0)).getTime()
  const d = Date.parse(t)
  return Number.isFinite(d) ? d : null
}
const isoDay = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
const hash = s => { let h = 5381; for (const c of String(s)) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36) }
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '')

/**
 * rows → workouts { id: session } in this app's format, plus what kind of file it was.
 * enToPl: optional map normalised English name → Polish catalogue name (other apps' names become ours).
 */
export function fromCSV(text, enToPl = {}) {
  const rows = parseCSV(text)
  if (rows.length < 2) return { kind: null, sessions: {} }
  const h = rows[0].map(x => x.trim().toLowerCase())
  const col = (...names) => { for (const n of names) { const i = h.indexOf(n.toLowerCase()); if (i >= 0) return i } return -1 }
  let kind = null
  if (col('exercise id') >= 0 && col('workout id') >= 0) kind = 'inchup'
  else if (col('exercise_title') >= 0) kind = 'hevy'
  else if (col('exercise name') >= 0 && col('set order') >= 0) kind = 'strong'
  if (!kind) return { kind: null, sessions: {} }
  const lbs = kind === 'hevy' ? col('weight_lbs') >= 0 && col('weight_kg') < 0 : h.some(x => x.includes('lbs'))
  const toKg = w => (w == null ? null : lbs ? Math.round(w * 0.45359237 * 4) / 4 : w)

  const plans = visiblePlans()
  const out = {}
  for (const r of rows.slice(1)) {
    const g = i => (i >= 0 ? (r[i] ?? '').trim() : '')
    let start, title, exName, part = '', w, reps, sec, rir, type, wid, xid = ''
    if (kind === 'inchup') {
      start = parseWhen(g(col('date')) + ' ' + (g(col('time')) || '12:00')); title = g(col('workout')); exName = g(col('exercise')); part = g(col('part'))
      w = num(g(col('weight (kg)'))); reps = num(g(col('reps'))); sec = num(g(col('seconds'))); rir = num(g(col('rir'))); type = g(col('set type')).toLowerCase(); wid = g(col('workout id')); xid = g(col('exercise id'))
    } else if (kind === 'strong') {
      start = parseWhen(g(col('date'))); title = g(col('workout name')); exName = g(col('exercise name'))
      w = toKg(num(g(col('weight')))); reps = num(g(col('reps'))); sec = num(g(col('seconds'))); rir = num(g(col('rpe'))) != null ? Math.max(0, Math.round(10 - num(g(col('rpe'))))) : null
      type = g(col('set order')).toLowerCase() === 'w' ? 'warmup' : ''
      if (String(g(col('set order'))).toLowerCase() === 'rest timer') continue
    } else {
      start = parseWhen(g(col('start_time'))); title = g(col('title')); exName = g(col('exercise_title'))
      w = toKg(num(g(col('weight_kg', 'weight_lbs')))); reps = num(g(col('reps'))); sec = num(g(col('duration_seconds'))); type = g(col('set_type')).toLowerCase()
      rir = num(g(col('rpe'))) != null ? Math.max(0, Math.round(10 - num(g(col('rpe'))))) : null
    }
    if (!start || !exName) continue
    const name = enToPl[norm(exName)] || exName
    const id = wid || 'imp-' + hash(start + '|' + title)
    const s = (out[id] ||= { id, date: isoDay(start), day: -1, title, ex: {}, started: start, finished: true, updated: start, imported: kind })
    const key = part ? name + ' · ' + part : name
    if (reps === 0) reps = null
    if (sec === 0) sec = null
    const set = w != null && w > 0 ? { w, r: reps ?? null, d: true } : reps != null ? { w: reps, d: true } : sec != null ? { w: sec, d: true } : null
    if (!set) continue
    if (w != null && w > 0 && reps == null) delete set.r
    if (rir != null) set.q = Math.min(3, rir)
    if (TYPE_BACK[type]) set.t = TYPE_BACK[type]
    ;(s.ex[key] ||= []).push(set)
    if (xid) (s.xid ||= {})[key] = xid
  }
  // each workout goes to the training with that name, else the one sharing the most exercises
  for (const s of Object.values(out)) {
    const byTitle = plans.find(i => norm(PLAN[i].name) === norm(s.title))
    if (byTitle != null) s.day = byTitle
    else {
      let best = plans[0] ?? 0, score = -1
      for (const i of plans) {
        const names = new Set(PLAN[i].ex.map(e => (e[3] === 'stages' ? PULLUP : e[0])))
        const sc = Object.keys(s.ex).filter(k => names.has(k.split(' · ')[0])).length
        if (sc > score) { score = sc; best = i }
      }
      s.day = best
    }
    delete s.title
    s.updated = s.started + 60 * 60e3
  }
  return { kind, sessions: out }
}
