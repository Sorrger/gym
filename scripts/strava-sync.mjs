// Runs in GitHub Actions (see .github/workflows/strava.yml). No dependencies, Node 20+.
// 1. reads the backup gist (workouts + strava-auth.json written by the phone)
// 2. logs in to Strava with the secret (refresh token kept in strava-auth.json)
// 3. pulls recent strength activities (heart rate, kcal, time), matches them to workouts by time
// 4. writes the exercise list into the Strava activity description
// 5. saves everything to strava.json in the gist; the app shows it
import { PLAN, groupsOf, UNITS } from '../src/plan.js'
import { musclesOf } from '../src/muscles.js'
const { GIST_TOKEN, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET } = process.env
if (!GIST_TOKEN || !STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) { console.log('Strava secrets not set – nothing to do'); process.exit(0) }

const BACKUP = 'gym-backup.json', AUTH = 'strava-auth.json', OUT = 'strava.json'
const STRENGTH = /WeightTraining|Workout|Crossfit|HighIntensityIntervalTraining/i
const MARK = '🏋️ Gym'

async function gh(path, opts = {}) {
  const r = await fetch('https://api.github.com' + path, { ...opts, headers: { Authorization: 'Bearer ' + GIST_TOKEN, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' } })
  if (!r.ok) throw new Error('GitHub ' + r.status + ' ' + path)
  return r.json()
}
async function fileOf(g, name) {
  const f = g.files?.[name]
  if (!f) return null
  return JSON.parse(f.truncated ? await (await fetch(f.raw_url, { headers: { Authorization: 'Bearer ' + GIST_TOKEN } })).text() : f.content)
}
async function findGist() {
  for (let page = 1; page <= 5; page++) {
    const list = await gh('/gists?per_page=100&page=' + page)
    const g = list.find(x => x.files?.[BACKUP])
    if (g) return g.id
    if (list.length < 100) break
  }
  throw new Error('Backup gist not found')
}

let token = ''
async function sv(path, opts = {}) {
  const r = await fetch('https://www.strava.com/api/v3' + path, { ...opts, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } })
  if (r.status === 429) throw new Error('Strava rate limit')
  if (!r.ok) throw new Error('Strava ' + r.status + ' ' + path + ' ' + (await r.text()).slice(0, 200))
  return r.json()
}
async function oauth(body) {
  const r = await fetch('https://www.strava.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: STRAVA_CLIENT_ID, client_secret: STRAVA_CLIENT_SECRET, ...body }) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) { const e = new Error('Strava login: ' + r.status + ' ' + JSON.stringify(j).slice(0, 200)); e.auth = true; throw e }
  return j
}

const UNIT = Object.fromEntries(PLAN.flatMap(d => d.ex.flatMap(e => groupsOf(e).map(g => [g.key, g.unit]))))
const PL = { chest: 'klatka', shoulders: 'barki', biceps: 'biceps', forearms: 'przedramiona', abs: 'brzuch', obliques: 'skośne brzucha',
  quads: 'czworogłowe uda', calves: 'łydki', traps: 'kaptury', reardelts: 'tył barków', upperback: 'górne plecy', lats: 'najszersze grzbietu',
  triceps: 'triceps', lowerback: 'dolne plecy', glutes: 'pośladki', hamstrings: 'dwugłowe uda' }
// default names from Strava / Garmin ("Night Weight Training", "Siła", "Trening siłowy"…) may be replaced; a name the user typed stays
const DEFAULT_NAME = /^((morning|lunch|afternoon|evening|night)\s+)?(weight training|workout|strength( training)?|si[łl]a|trening( si[łl]owy)?|[a-ząćęłńóśźż ]*trening si[łl]owy)$/i
const fmt = v => String(+(+v).toFixed(2)).replace('.', ',')
function describe(s) {
  const lines = []
  let n = 0
  for (const [key, sets] of Object.entries(s.ex || {})) {
    const done = sets.filter(x => x.d)
    if (!done.length) continue
    n += done.length
    const unit = UNIT[key] || 'kg'
    const parts = done.map(x => x.w == null ? '✓' : unit === 'kg' ? `${fmt(x.w)}×${x.r ?? 6}` : `${fmt(x.w)} ${UNITS[unit].short}`)
    lines.push(`• ${key}: ${parts.join(', ')}${unit === 'kg' ? ' kg' : ''}`)
  }
  const plan = PLAN[s.day]?.name || ''
  const main = new Set(), help = new Set()
  for (const key of Object.keys(s.ex || {})) {
    if (!(s.ex[key] || []).some(x => x.d)) continue
    const m = musclesOf(key.split(' · ')[0]); m.main.forEach(x => main.add(x)); m.help.forEach(x => help.add(x))
  }
  main.forEach(x => help.delete(x))
  const parts = [...main].map(x => PL[x]).join(', ') + (help.size ? ` (pomocniczo: ${[...help].map(x => PL[x]).join(', ')})` : '')
  return n ? `${MARK} ${plan} – ${n} ${n === 1 ? 'seria' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'serie' : 'serii'}\n💪 Partie: ${parts}\n\n${lines.join('\n')}` : ''
}
const mergeDesc = (old, ours) => {
  old = old || ''
  const i = old.indexOf(MARK)
  const keep = (i >= 0 ? old.slice(0, i) : old).trimEnd()
  return keep ? keep + '\n\n' + ours : ours
}

const gistId = await findGist()
const g = await gh('/gists/' + gistId)
const backup = await fileOf(g, BACKUP)
let auth = (await fileOf(g, AUTH)) || {}
const prev = (await fileOf(g, OUT)) || {}
// nothing to do on days without training: no Strava calls at all (only the gist is read)
const recent = Object.values(backup?.sessions || {}).some(x => (x.updated || x.started || 0) > Date.now() - 36 * 3600e3)
if (!auth.code && auth.refresh_token && !recent && !process.env.FORCE) { console.log('No workout in the last 36 h – skipping Strava'); process.exit(0) }
const out = { at: new Date().toISOString(), athlete: prev.athlete || null, acts: prev.acts || {}, authError: '' }
const files = {}

try {
  if (auth.code) {
    const j = await oauth({ code: auth.code, grant_type: 'authorization_code' })
    if (!/activity:read_all/.test(j.scope || 'activity:read_all') && j.scope) throw Object.assign(new Error('Brak zgody na treningi'), { auth: true })
    auth = { refresh_token: j.refresh_token, athlete: j.athlete?.id, connectedAt: new Date().toISOString() }
    out.athlete = { id: j.athlete?.id, name: [j.athlete?.firstname, j.athlete?.lastname].filter(Boolean).join(' ') }
    files[AUTH] = auth
  }
  if (!auth.refresh_token) { out.authError = out.athlete ? 'Połącz Stravę ponownie' : ''; throw Object.assign(new Error('not connected'), { quiet: true }) }
  const t = await oauth({ refresh_token: auth.refresh_token, grant_type: 'refresh_token' })
  token = t.access_token
  if (t.refresh_token && t.refresh_token !== auth.refresh_token) { auth.refresh_token = t.refresh_token; files[AUTH] = auth }
  if (!out.athlete) { const a = await sv('/athlete'); out.athlete = { id: a.id, name: [a.firstname, a.lastname].filter(Boolean).join(' ') } }

  const after = Math.floor(Date.now() / 1000) - 10 * 86400
  const list = await sv(`/athlete/activities?after=${after}&per_page=60`)
  const sessions = Object.values(backup?.sessions || {})
  for (const a of list) {
    if (!STRENGTH.test(a.sport_type || a.type || '')) continue
    const start = Date.parse(a.start_date), end = start + a.elapsed_time * 1000
    // the workout in the app that overlaps this activity the most (same day, started within ±90 min)
    let best = null, bestScore = -Infinity
    for (const s of sessions) {
      if (!s.started) continue
      const sEnd = s.updated || s.started
      const overlap = Math.min(end, sEnd) - Math.max(start, s.started)
      const gap = Math.abs(s.started - start)
      if (gap > 90 * 60e3 && overlap <= 0) continue
      const score = overlap - gap
      if (score > bestScore) { best = s; bestScore = score }
    }
    const old = out.acts[a.id] || {}
    const act = { id: a.id, name: a.name, start: a.start_date, elapsed: a.elapsed_time, moving: a.moving_time,
      hr: a.average_heartrate ?? old.hr ?? null, hrMax: a.max_heartrate ?? old.hrMax ?? null,
      kcal: old.kcal ?? null, hrs: old.hrs ?? null, session: best?.id || null, written: old.written || '' }
    if (act.kcal == null) { const d = await sv('/activities/' + a.id); act.kcal = d.calories ?? null }
    if (!act.hrs && a.has_heartrate) {
      try {
        const st = await sv(`/activities/${a.id}/streams?keys=heartrate,time&key_by_type=true`)
        const hr = st.heartrate?.data || [], tm = st.time?.data || []
        const step = Math.max(1, Math.ceil(hr.length / 150))
        act.hrs = hr.filter((_, i) => i % step === 0).map((v, i) => [Math.round(tm[i * step] || 0), v])
      } catch (e) { console.warn(e.message) }
    }
    if (best) {
      const text = describe(best)
      const title = `${PLAN[best.day]?.name || 'Trening'} · Gym 🏋️`
      const rename = a.name !== title && (DEFAULT_NAME.test(a.name.trim()) || a.name === old.title)
      if ((text && text !== act.written) || rename) {
        const d = await sv('/activities/' + a.id)
        const body = {}
        if (text && text !== act.written) body.description = mergeDesc(d.description, text)
        if (rename) body.name = title
        await sv('/activities/' + a.id, { method: 'PUT', body: JSON.stringify(body) })
        if (body.description) act.written = text
        if (rename) { act.title = title; act.name = title }
        console.log('Updated activity', a.id, Object.keys(body).join('+'))
      }
      if (old.title) act.title = act.title || old.title
    }
    out.acts[a.id] = act
  }
  // keep the file small: last 120 activities
  const ids = Object.keys(out.acts).sort((x, y) => (out.acts[y].start || '').localeCompare(out.acts[x].start || ''))
  for (const id of ids.slice(120)) delete out.acts[id]
} catch (e) {
  if (!e.quiet) { console.error(e.message); if (e.auth) { out.authError = 'Połącz Stravę ponownie'; files[AUTH] = {} } else out.error = e.message.slice(0, 200) }
}

const same = JSON.stringify({ ...prev, at: 0 }) === JSON.stringify({ ...out, at: 0 })
if (!same) files[OUT] = out
if (Object.keys(files).length) {
  const body = { files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, { content: JSON.stringify(v, null, 1) }])) }
  await gh('/gists/' + gistId, { method: 'PATCH', body: JSON.stringify(body) })
  console.log('Saved', Object.keys(files).join(', '))
} else console.log('No changes')
