// Movement of every catalogue exercise for the shared rig (rig.js). One entry per catalogue base id:
// (sel) → { frames: [start, end, …], gear, props, lab: [first half, second half], view?, ph? }.
// Positions: floor y 0, up negative, the figure faces right. FIG sizes: torso 82, upper arm 46, forearm 42, thigh 70, shin 68.
import { joints } from './rig'

const STAND = { hx: 0, hy: -144, t: -90, l1: 90, l2: 90, a1: 90, a2: 90, fx: 6, fy: -7 }
const st = o => ({ ...STAND, ...o })
const SEAT = { hx: 0, hy: -74, t: -90, l1: 0, l2: 90, a1: 90, a2: 90 }
const seat = o => ({ ...SEAT, ...o })
// lying on the back on a flat bench (head left)
const BENCH_Y = -50
const lie = o => ({ hx: 40, hy: BENCH_Y - 12, t: 180, fx: 108, fy: -7, a1: -90, a2: -90, ...o })
// hand target relative to the shoulder of that pose
function hand(p, dx, dy, far) { const S = joints(p).S; return far ? { ...p, bx: S.x + dx, by: S.y + dy } : { ...p, ax: S.x + dx, ay: S.y + dy } }
const shoulderOf = p => joints(p).S
// straight body from the feet at angle `ang` (plank / push-up): legs straight, torso in line
const LEG = 138
function board(fx, fy, ang, ex = {}) {
  // face down: on the toes, heels up – the ankle sits above the floor and the foot slants down to the toes
  const down = ang > -90 && ang < 60, ay = down ? fy - 8 : fy
  const r = ang * Math.PI / 180
  return { hx: fx + Math.cos(r) * LEG, hy: ay + Math.sin(r) * LEG, t: ang, l1: ang + 180, l2: ang + 180, fx, fy: ay, ...(down ? { fo: 50 + ang } : {}), ...ex }
}
const shoulderX = (fx, ang) => fx + Math.cos(ang * Math.PI / 180) * (LEG + 82)

function legCurl(sel) {
  if (sel.pos === 'stand') { const b = st({ fx: null, fy: null, t: -86, l1: 94, m1: 88, m2: 90, a1: 60, a2: 0, b1: 60, b2: 0 }); return { frames: [{ ...b, l2: 94 }, { ...b, l2: 205 }], props: [{ k: 'pad', x1: 34, y1: -150, x2: 34, y2: -110, w: 12 }, { k: 'post', x: 50, y2: -110 }], gear: [{ k: 'lever', pivot: 'knee', to: 'roller', side: 1 }, { k: 'shin', side: 1 }], lab: ['Zegnij', 'Wyprostuj'] } }
  if (sel.pos === 'lying') { const b = { hx: -10, hy: -84, t: 180, l1: 0, l2: 0, a1: 140, a2: 90 }; return { frames: [b, { ...b, l2: -100 }], props: [{ k: 'bench', x: -30, y: -72, len: 150 }], gear: [{ k: 'lever', pivot: 'knee', to: 'roller' }, { k: 'shin' }], lab: ['Zegnij', 'Wyprostuj'] } }
  const b = seat({ t: -98 }); return { frames: [{ ...b, l2: -4 }, { ...b, l2: 110 }], props: [SEAT_PROP, BACKREST, { k: 'pad', x1: 30, y1: -90, x2: 66, y2: -90, w: 10 }], gear: [{ k: 'lever', pivot: 'knee', to: 'roller', side: 1 }, { k: 'shin', side: 1 }], lab: ['Zegnij', 'Wyprostuj'] }
}
const FLAT_BENCH = { k: 'bench', x: 8, y: BENCH_Y, len: 168 }
const SEAT_PROP = { k: 'seat', x: -4, y: -66 }
// seated, seen from the front: thighs point at the viewer (short)
const FSEAT = { hx: 0, hy: -92, t: -90, l1: 90, l2: 90, tf: 0.25 }
const FSEAT_PROPS = [{ k: 'pad', x1: -34, y1: -84, x2: 34, y2: -84, w: 14 }, { k: 'post', x: 0, y2: -78 }]
const BACKREST = { k: 'pad', x1: -16, y1: -70, x2: -16, y2: -176 }

// what the hands hold, by equipment
function held(eq, o = {}) {
  switch (eq) {
    case 'bb': case 'ez': case 'sm': case 'hx': return [{ k: 'bb', ...o }]
    case 'db': return [{ k: 'db', both: true, ...o }]
    case 'kb': return [{ k: 'kb', both: true, ...o }]
    case 'pl': return [{ k: 'pl', ...o }]
    case 'mc': case 'as': return [{ k: 'handle', ...o }]
    case 'cb': return o.from ? [{ k: 'cable', ...o }] : [{ k: 'handle' }]
    case 'bd': return o.from ? [{ k: 'band', ...o }] : []
    case 'tb': return o.from ? [{ k: 'pole', ...o }] : []
  }
  return []
}
const tower = (x, top = -300, pulley) => ({ k: 'tower', x, top, pulley: pulley ?? top + 8 })
const UP = ['Unieś', 'Opuść'], PRESS = ['Opuść', 'Wypchnij'], PULL = ['Przyciągnij', 'Wróć'], SQ = ['Zejdź', 'Wstań']
const holdPh = [[2200, 'Trzymaj', 0, 1], [2200, 'Trzymaj', 1, 0]]
const seq = (labels, ms = 900) => labels.map((l, i) => [ms, l, i / labels.length, (i + 1) / labels.length])

// ---------- chest ----------
function benchLike(sel, top = [6, -86], bot = [24, -16]) {
  const a = sel.angle === 'incline' ? 32 : sel.angle === 'decline' ? -18 : 0
  const base = lie({ t: 180 + a, hy: BENCH_Y - 12 - (a > 0 ? 6 : 0) })
  const S = shoulderOf(base)
  const props = a > 0 ? [{ k: 'pad', x1: base.hx + 10, y1: BENCH_Y + 6, x2: S.x - 30, y2: S.y + 12 - 18 }, { k: 'seat', x: base.hx + 8, y: BENCH_Y }] : a < 0 ? [{ k: 'bench', x: 10, y: BENCH_Y + 8, len: 168, ang: a }] : [FLAT_BENCH]
  return { frames: [hand(base, ...top), hand(base, ...bot)], props, lab: PRESS }
}
// lying chest-down on an incline bench, arms hang and row up
function chestRow(eq) {
  const b = { hx: -40, hy: -96, t: -34, fx: 20, fy: -7 }, S = shoulderOf(b)
  return { frames: [{ ...b, ax: S.x + 4, ay: S.y + 84 }, { ...b, ax: S.x - 30, ay: S.y + 26, ab: 1 }],
    props: [{ k: 'pad', x1: -46, y1: -84, x2: S.x + 8, y2: S.y + 20, w: 14 }, { k: 'post', x: -10, y2: -84 }, { k: 'pad', x1: -66, y1: -84, x2: -20, y2: -84, w: 10 }],
    gear: eq === 'tb' ? [{ k: 'pole', from: { x: -170, y: -4 } }] : held('db'), lab: PULL }
}
const LIB = {
  'bench-press': sel => ({ ...benchLike(sel, sel.width === 'close' ? [4, -86] : [6, -86], sel.width === 'close' ? [30, -14] : [24, -16]), gear: held(sel.eq, sel.eq === 'db' ? {} : { z: 'back' }) }),
  'chest-press': sel => {
    const b = seat({ t: -92 })
    const pro = sel.angle === 'incline' ? [-6, -30] : [0, 0]
    return { frames: [hand(b, 14, 8), hand(b, 84 + pro[1] / 4, pro[1])], props: [SEAT_PROP, BACKREST], gear: sel.eq === 'cb' ? [{ k: 'cable', from: { x: -90, y: -150 } }] : [{ k: 'lever', pivot: { x: shoulderOf(b).x - 24, y: shoulderOf(b).y - 66 } }, { k: 'handle' }], lab: ['Wypchnij', 'Wróć'] }
  },
  fly: sel => {
    // seen from the front (lying: from above): an arm swinging towards the viewer gets shorter (af)
    if (sel.eq === 'cb') {
      // front view: the projected arm turns from out to the side towards the middle and gets shorter as it swings forward
      const v = sel.v || 'mid', b = st()
      // the arm swings round in a plane through the shoulder: seen from the front it keeps its direction (out) and
      // shortens as it turns towards the viewer, then points a little inward for the last bit where the hands meet
      const arm = (a, k, bend = 10) => ({ ...b, a1: a, a2: a + bend, af: k, ff: k })
      const path = (out, inn, bend, end) => [0, 25, 50, 70, 84].map(d => arm(out, Math.cos(d * Math.PI / 180), bend)).concat([arm(out, 0.04, bend), arm(inn, 0.04, -bend), arm(inn, end, -bend)])
      const frames = v === 'lowhigh' ? path(55, 125 - 270, 10, 0.26) : v === 'highlow' ? path(-48, 148, 14, 0.3) : path(-4, 184, 10, 0.24)
      const ay = v === 'lowhigh' ? -30 : v === 'highlow' ? -300 : -226
      return { view: 'f', frames, props: [tower(150, -320, ay), tower(-150, -320, ay)], gear: [{ k: 'cable', from: { x: 150, y: ay }, from2: { x: -150, y: ay }, both: true }], lab: ['Złącz', 'Rozciągnij'] }
    }
    if (sel.eq === 'mc') { // butterfly: nearly straight arms at shoulder height swing round to meet in front
      const b = { hx: 0, hy: -92, t: -90, l1: 90, l2: 90, tf: 0.25 }
      const arm = (a, k, bend) => ({ ...b, a1: a, a2: a + bend, af: k, ff: k })
      const frames = [0, 25, 50, 70, 84].map(d => arm(6, Math.cos(d * Math.PI / 180), 8)).concat([arm(6, 0.04, 8), arm(178, 0.04, -8), arm(178, 0.2, -8)])
      return { view: 'f', frames, props: [{ k: 'pad', x1: 0, y1: -100, x2: 0, y2: -250, w: 40 }, { k: 'pad', x1: -34, y1: -84, x2: 34, y2: -84, w: 14 }, { k: 'post', x: 0, y2: -78 }], gear: [{ k: 'deck', y: -262 }, { k: 'handle', both: true }], lab: ['Złącz', 'Rozciągnij'] } }
    const b = { hx: 0, hy: -150, t: -90, l1: 90, l2: 90 }
    return { view: 'f', top: true, frames: [{ ...b, a1: 4, a2: 4, af: 0.16 }, { ...b, a1: 6, a2: 22, af: 1 }], props: [{ k: 'pad', x1: 0, y1: -120, x2: 0, y2: -268, w: 64 }], gear: held('db'), lab: ['Rozciągnij', 'Złącz'] }
  },
  'push-up': sel => {
    const v = sel.v || 'floor'
    if (v === 'knees') {
      // straight line knees → hips → shoulders, pivoting on the knees; shins on the floor
      const KX = -70, KY = -9, R = Math.PI / 180, hxk = KX + Math.cos(-8 * R) * 152 - 22
      const k = a => ({ hx: KX + Math.cos(a * R) * 70, hy: KY + Math.sin(a * R) * 70, t: a, l1: a + 180, l2: 182, fo: 180, ax: hxk, ay: -4, ab: 1 })
      return { frames: [k(-30), k(-8)], gear: sel.eq === 'pl' ? [{ k: 'pl', at: 'back', z: 'mid' }] : [], lab: PRESS }
    }
    const [fy, hy, a0, a1] = v === 'feetup' ? [-46, -4, -12, 2] : v === 'handsup' ? [-7, -46, -36, -22] : [-7, -4, -23, -8]
    const hx = shoulderX(-122, a1) - 24
    const mk = a => board(-122, fy, a, { ax: hx, ay: hy, ab: 1 })
    const props = v === 'feetup' ? [{ k: 'box', x: -126, w: 40, h: 40 }] : v === 'handsup' ? [{ k: 'box', x: hx, w: 46, h: 40 }] : []
    return { frames: [mk(a0), mk(a1)], props, gear: sel.eq === 'pl' ? [{ k: 'pl', at: 'back', z: 'mid' }] : [], lab: PRESS }
  },
  dip: sel => {
    const bar = { x: 18, y: -172 }
    // body between the bars: hands on the bar by the hips at the top, shoulders drop to about bar height
    const mk = (hx, hy, t) => ({ hx, hy, t, l1: 100, l2: 192, ax: bar.x, ay: bar.y, ab: 1 })
    const up = sel.v === 'upright'
    return { frames: [mk(0, bar.y - 6, up ? -90 : -80), mk(up ? 6 : -4, bar.y + 40, up ? -84 : -64)], props: [{ k: 'post', x: bar.x, y2: bar.y, w: 6 }, { k: 'pad', x1: bar.x - 12, y1: bar.y, x2: bar.x + 18, y2: bar.y, w: 7 }], lab: ['Opuść', 'Wypchnij'] }
  },
  pullover: sel => { const b = lie({}); return { frames: [{ ...b, a1: -88, a2: -88 }, { ...b, a1: -168, a2: -165 }], props: [FLAT_BENCH], gear: sel.eq === 'cb' || sel.eq === 'mc' ? [{ k: 'cable', from: { x: -110, y: -60 } }, { k: 'handle' }] : held(sel.eq), lab: ['Opuść', 'Przenieś'] } },
  'landmine-press': sel => {
    const b = sel.pos === 'kneel' ? { hx: 0, hy: -76, t: -86, l1: 90, l2: 180, fo: 180 } : st({ t: -80, fx: 30, gx: -40, gy: -7 })
    return { frames: [{ ...hand(b, 16, 4), ab: 1 }, { ...hand(b, 72, -54), ab: 1 }], gear: [{ k: 'pole', from: { x: 250, y: -4 }, over: 6 }], props: [{ k: 'line', x1: 240, y1: -2, x2: 262, y2: -2, w: 8 }], lab: ['Wypchnij', 'Opuść'] }
  },
  'floor-press': sel => {
    const b = { hx: 40, hy: -13, t: 180, fx: 100, fy: -7 }
    return { frames: [hand(b, 6, -86), hand(b, 22, -20)], gear: held(sel.eq, sel.eq === 'bb' ? { z: 'back' } : {}), lab: PRESS }
  },
  'svend-press': sel => { const b = st({}); return { frames: [hand(b, 18, 36), hand(b, 84, 30)], gear: held(sel.eq === 'db' ? 'db' : 'pl'), lab: ['Wypchnij', 'Wróć'] } },

  // ---------- back ----------
  'pull-up': sel => {
    // front view: hanging from the bar, pulled up until the chin is over it
    const bar = -330, w = sel.width === 'close' || sel.grip === 'under' || sel.grip === 'neutral' ? 22 : sel.width === 'wide' ? 52 : 38
    const mk = hy => ({ hx: 0, hy, t: -90, l1: 92, l2: 98, ax: w, ay: bar, ab: 1, ...(sel.eq === 'as' ? { tf: 0.4, sf: 0.35 } : {}) }) // assisted: kneeling on the pad (thighs towards the viewer)
    const props = [{ k: 'line', x1: -84, y1: bar, x2: 84, y2: bar, w: 5 }, { k: 'line', x1: -84, y1: bar, x2: -84, y2: 0, w: 6 }, { k: 'line', x1: 84, y1: bar, x2: 84, y2: 0, w: 6 }]
    return { view: 'f', frames: [mk(bar + 168), mk(bar + 104)], props, gear: sel.eq === 'pl' ? [{ k: 'belt' }] : sel.eq === 'as' ? [{ k: 'footpad' }] : sel.eq === 'bd' ? [{ k: 'footband', top: bar }] : [], lab: ['Podciągnij', 'Opuść'] }
  },
  'lat-pulldown': sel => {
    // front view: arms in a wide V, elbows drive down to the sides, bar to the upper chest
    const kneel = sel.pos === 'kneel', narrow = sel.width === 'close'
    const b = kneel ? { hx: 0, hy: -78, t: -90, l1: 90, l2: 90, sf: 0.12 } : { ...FSEAT }
    const up = narrow ? { a1: -78, a2: -82 } : { a1: -58, a2: -62 }, down = narrow ? { a1: 70, a2: -100 } : { a1: 38, a2: -88 }
    return { view: 'f', frames: [{ ...b, ...up }, { ...b, ...down }], props: kneel ? [] : [...FSEAT_PROPS, { k: 'pad', x1: -30, y1: -102, x2: 30, y2: -102, w: 9 }], gear: [{ k: 'bar2', top: -340 }], lab: PULL }
  },
  'bb-row': sel => {
    const lean = sel.v === 'yates' ? -40 : sel.v === 'pendlay' ? -8 : -22
    const b = st({ hx: -34, hy: -124, t: lean, fx: 8 })
    const S = shoulderOf(b)
    return { frames: [{ ...b, ax: S.x + 6, ay: Math.min(S.y + 86, -24) }, { ...b, ax: S.x - 34, ay: S.y + 26 }], gear: held(sel.eq), lab: PULL }
  },
  'db-row': sel => {
    const pos = sel.pos || 'bench'
    if (pos === 'bench' && sel.side !== 'both') {
      const b = { hx: -40, hy: -146, t: -8, fx: -62, fy: -7, gx: -104, gy: -94, bx: 50, by: -98, bb: 1 }
      const S = shoulderOf(b)
      return { frames: [{ ...b, ax: S.x + 2, ay: S.y + 84 }, { ...b, ax: S.x - 36, ay: S.y + 26, ab: 1 }], props: [{ k: 'bench', x: -20, y: -100, len: 200, legs: [-0.8, 0.8] }], gear: held('db'), lab: PULL }
    }
    if (pos === 'chest') return chestRow('db')
    // bent over, no support
    const b = st({ hx: -34, hy: -124, t: -18, fx: 8 }), S = shoulderOf(b)
    return { frames: [{ ...b, ax: S.x + 4, ay: S.y + 86 }, { ...b, ax: S.x - 32, ay: S.y + 28, ab: 1 }], gear: held('db'), lab: PULL }
  },
  'cable-row': sel => {
    // hands travel in a straight line at the height of the pulley, between the knees, to the belly
    const b = { hx: 0, hy: -44, fx: 124, fy: -36 }, y = -66
    return { frames: [{ ...b, t: -68, ax: 128, ay: y }, { ...b, t: -96, ax: 22, ay: y - 4, ab: 1 }], props: [{ k: 'seat', x: 0, y: -38, w: 60 }, { k: 'pad', x1: 140, y1: -12, x2: 140, y2: -66, w: 10 }, tower(170, -90, y)], gear: [{ k: 'cable', from: { x: 170, y } }], lab: PULL }
  },
  'tbar-row': sel => { if (sel.pos === 'chest') return chestRow('tb'); const L = LIB['bb-row']({ eq: 'bb' }); return { ...L, gear: [{ k: 'pole', from: { x: -170, y: -4 } }] } },
  'machine-row': sel => { const b = seat({ t: -84 }); return { frames: [hand(b, 84, sel.v === 'high' ? -6 : 14), hand(b, 4, sel.v === 'high' ? 4 : 34)], props: [SEAT_PROP, { k: 'pad', x1: 30, y1: -110, x2: 30, y2: -170, w: 12 }], gear: [{ k: 'lever', pivot: { x: shoulderOf(b).x + 70, y: -40 } }, { k: 'handle' }], lab: PULL } },
  'seal-row': sel => {
    const b = { hx: -40, hy: -114, t: 0, l1: 180, l2: 182 }
    const S = shoulderOf(b)
    return { frames: [{ ...b, ax: S.x + 2, ay: Math.min(S.y + 86, -26) }, { ...b, ax: S.x - 22, ay: S.y + 30 }], props: [{ k: 'bench', x: -60, y: -102, len: 290, legs: [-0.8, 0.55] }], gear: held(sel.eq), lab: PULL }
  },
  'inverted-row': () => {
    // straight body pivoting on the heels, chest pulled up to the bar
    const bar = { x: -92, y: -110 }
    const mk = a => board(130, -7, a, { ax: bar.x, ay: bar.y, ab: 1, fo: 270 })
    return { frames: [mk(185), mk(201)], props: [{ k: 'post', x: bar.x - 20, y2: bar.y }, { k: 'pad', x1: bar.x - 20, y1: bar.y, x2: bar.x + 10, y2: bar.y, w: 6 }], lab: PULL }
  },
  'straight-arm': sel => { const b = st({ t: -72, hx: -20 }); return { frames: [{ ...b, a1: -40, a2: -38 }, { ...b, a1: 92, a2: 92 }], props: [tower(150, -320)], gear: [{ k: 'cable', from: { x: 150, y: -312 } }], lab: ['Ściągnij', 'Wróć'] } },
  shrug: sel => ({ frames: [st({ sg: 0, a1: 90, a2: 90 }), st({ sg: 16, a1: 90, a2: 90 })], gear: sel.eq === 'mc' ? [{ k: 'lever', pivot: { x: -64, y: -70 } }, { k: 'handle' }] : sel.eq === 'cb' ? [{ k: 'cable', from: { x: 48, y: -12 } }, { k: 'handle' }] : held(sel.eq), props: sel.eq === 'cb' ? [tower(54, -50, -12)] : [], lab: UP }),
  'face-pull': sel => { const b = sel.pos === 'seat' ? seat({}) : sel.pos === 'kneel' ? { hx: 0, hy: -76, t: -90, l1: 90, l2: 180, fo: 180 } : st({ t: -86, fx: 24, gx: -30, gy: -7 }); return { frames: [hand(b, 86, -8), { ...hand(b, 14, -36), ab: -1 }], props: [tower(190, -300, shoulderOf(b).y - 10), ...(sel.pos === 'seat' ? [SEAT_PROP] : [])], gear: [{ k: sel.eq === 'bd' ? 'band' : 'cable', from: { x: 190, y: shoulderOf(b).y - 10 } }], lab: PULL } },
  'reverse-fly': sel => {
    if (sel.eq === 'mc') { // side view, chest on the pad: handles start in front and swing out and back behind the shoulders
      const b = seat({ t: -88 }), S = shoulderOf(b), R = Math.PI / 180
      const arm = (a, k) => ({ ...b, a1: a, a2: a, af: k, ff: k })
      const frames = [0, 30, 55, 75].map(d => arm(-4, Math.cos(d * R))).concat([arm(-4, 0.06), arm(184, 0.06), arm(184, 0.24)])
      return { frames, props: [SEAT_PROP, { k: 'pad', x1: S.x + 27, y1: S.y + 2, x2: S.x + 27, y2: S.y + 62, w: 17 }, { k: 'post', x: S.x + 27, y2: S.y + 62 }], gear: [{ k: 'lever', pivot: { x: S.x + 2, y: S.y - 84 }, flex: true }, { k: 'handle' }], lab: ['Rozciągnij', 'Wróć'] }
    }
    if (sel.pos === 'chest') { const b = seat({ t: -84 }); return { frames: [{ ...b, a1: 4, a2: 4, af: 1, ff: 1 }, { ...b, a1: 24, a2: 24, af: 0.3, ff: 0.3 }], props: [SEAT_PROP, { k: 'pad', x1: 30, y1: -110, x2: 30, y2: -170, w: 12 }], gear: [{ k: 'handle' }], lab: ['Rozciągnij', 'Wróć'] } }
    const b = st({ hx: -34, hy: -124, t: -18 })
    return { frames: [{ ...b, a1: 92, a2: 96, af: 1, ff: 1 }, { ...b, a1: 118, a2: 122, af: 0.4, ff: 0.4 }], gear: held(sel.eq === 'cb' ? 'db' : sel.eq), lab: ['Rozciągnij', 'Wróć'] }
  },
  'back-extension': sel => {
    const mk = t => ({ hx: 0, hy: -150, t, l1: 150, l2: 150, hold: 'rack', ab: 1 })
    return { frames: [mk(96), mk(-22)], props: [{ k: 'pad', x1: -8, y1: -138, x2: 18, y2: -160, w: 14 }, { k: 'pad', x1: -110, y1: -76, x2: -120, y2: -66, w: 10 }, { k: 'line', x1: 0, y1: -138, x2: -40, y2: 0, w: 6 }, { k: 'line', x1: -116, y1: -70, x2: -80, y2: 0, w: 6 }], gear: sel.eq === 'pl' ? [{ k: 'pl', at: 'hold' }] : [], lab: ['Wyprostuj', 'Opuść'] }
  },
  'good-morning': () => ({ frames: [st({ hold: 'back', ab: -1 }), st({ hx: -36, hy: -132, t: -12, hold: 'back', ab: -1, fx: 4 })], gear: [{ k: 'bb', at: 'hold' }], lab: ['Pochyl', 'Wyprostuj'] }),
  'dead-hang': () => {
    const P = LIB['pull-up']({ eq: 'bw' }), bar = -330, mk = hy => ({ hx: 0, hy, t: -90, l1: 92, l2: 98, ax: 38, ay: bar, ab: 1 })
    return { ...P, frames: [mk(bar + 168), mk(bar + 167)], ph: holdPh }
  },

  'scap-pull-up': () => {
    const P = LIB['pull-up']({ eq: 'bw' }), bar = -330, mk = hy => ({ hx: 0, hy, t: -90, l1: 92, l2: 98, ax: 38, ay: bar, ab: 1 })
    return { ...P, frames: [mk(bar + 172), mk(bar + 160)], lab: ['Ściągnij łopatki', 'Rozluźnij'] }
  },
  'muscle-up': () => {
    // front view: pull high, turn the wrists over the bar, press up to straight arms
    const P = LIB['pull-up']({ eq: 'bw' }), bar = -330
    const hang = { hx: 0, t: -90, l1: 92, l2: 98, ax: 38, ay: bar, ab: 1 }
    return { ...P, frames: [{ ...hang, hy: bar + 168 }, { ...hang, hy: bar + 92 }, { ...hang, hy: bar + 40, ab: -1 }, { ...hang, hy: bar + 4, ax: 30, ab: -1 }],
      ph: [[800, 'Podciągnij', 0, 1 / 3], [700, 'Przejdź nad drążek', 1 / 3, 2 / 3], [700, 'Wypchnij', 2 / 3, 1], [500, 'Wypchnij', 1, 1], [1400, 'Opuść', 1, 0], [500, 'Opuść', 0, 0]] }
  },

  'landmine-row': () => { const b = st({ hx: -34, hy: -124, t: -24, fx: 10, gx: -50, gy: -7 }), S = shoulderOf(b); return { frames: [{ ...b, ax: S.x + 8, ay: S.y + 84 }, { ...b, ax: S.x - 30, ay: S.y + 28 }], gear: [{ k: 'pole', from: { x: 190, y: -4 } }], lab: PULL } },
  'renegade-row': sel => {
    const b = board(-122, -7, -25, {}), S = shoulderOf(b)
    return { frames: [{ ...b, ax: S.x + 2, ay: -14, ab: -1, bx: S.x + 2, by: -14, bb: -1 }, { ...b, ax: S.x - 36, ay: S.y + 24, ab: 1, bx: S.x + 2, by: -14, bb: -1 }], gear: held(sel.eq), lab: PULL }
  },
  'rear-delt-row': sel => {
    if (sel.pos === 'chest') { const C = chestRow(sel.eq === 'mc' ? 'db' : sel.eq), [b] = C.frames; const S = shoulderOf(b); return { ...C, frames: [b, { ...b, ax: S.x - 14, ay: S.y + 6, ab: 1 }] } }
    if (sel.pos === 'seat' || sel.eq === 'mc' || sel.eq === 'cb') { // seated / standing upright, pulling a cable or handles back at chest height, elbows high
      const b = sel.pos === 'seat' || sel.eq === 'mc' ? seat({ t: -88 }) : st({ fx: 20, gx: -20, gy: -7 }), S = shoulderOf(b), y = S.y + 10
      const fr = [{ ...b, ax: S.x + 84, ay: y }, { ...b, ax: S.x + 8, ay: y - 4, ab: 1 }]
      if (sel.eq === 'mc') return { frames: fr, props: [SEAT_PROP, { k: 'pad', x1: S.x + 22, y1: S.y + 10, x2: S.x + 22, y2: S.y + 70, w: 12 }], gear: [{ k: 'lever', pivot: { x: S.x + 60, y: S.y - 90 } }, { k: 'handle' }], lab: PULL }
      return { frames: fr, props: [...(b.l1 === 0 ? [SEAT_PROP] : []), tower(S.x + 150, -320, y)], gear: [{ k: sel.eq === 'bd' ? 'band' : 'cable', from: { x: S.x + 150, y } }], lab: PULL }
    }
    const b = st({ hx: -34, hy: -124, t: -16 }), S = shoulderOf(b); return { frames: [{ ...b, ax: S.x + 4, ay: S.y + 84 }, { ...b, ax: S.x - 14, ay: S.y + 6, ab: 1 }], gear: held(sel.eq), lab: PULL }
  },

  // ---------- shoulders ----------
  ohp: sel => {
    const seated = sel.pos === 'seat' || sel.eq === 'mc'
    const b = seated ? seat({ t: -90 }) : sel.pos === 'floor' ? { hx: 0, hy: -14, t: -90, l1: 0, l2: 0 } : st({})
    const S = shoulderOf(b)
    return { frames: [{ ...b, ax: S.x + 18, ay: S.y - 6, ab: 1 }, { ...b, ax: S.x + 4, ay: S.y - 86 }], props: seated ? [SEAT_PROP, BACKREST] : [], gear: sel.eq === 'mc' ? [{ k: 'lever', pivot: { x: S.x - 56, y: S.y + 20 } }, { k: 'handle' }] : held(sel.eq), lab: ['Wypchnij', 'Opuść'] }
  },
  arnold: sel => LIB.ohp({ ...sel, eq: 'db' }),
  'push-press': sel => {
    const b = st({}), dip = st({ hy: -128, hx: -6 })
    const r = p => { const S = shoulderOf(p); return { ...p, ax: S.x + 18, ay: S.y - 6 } }
    const top = { ...b, ...(() => { const S = shoulderOf(b); return { ax: S.x + 4, ay: S.y - 86 } })() }
    return { frames: [r(b), r(dip), top], gear: held(sel.eq), ph: [[600, 'Ugnij kolana', 0, 0.5], [500, 'Wybij i wypchnij', 0.5, 1], [700, 'Trzymaj', 1, 1], [1000, 'Opuść', 1, 0]] }
  },
  'lateral-raise': sel => ({ view: 'f', frames: sel.pos === 'seat' ? [{ ...FSEAT, a1: 80, a2: 88 }, { ...FSEAT, a1: 6, a2: 18 }] : [st({ a1: 80, a2: 88 }), st({ a1: 6, a2: 18 })], props: sel.pos === 'seat' ? FSEAT_PROPS : [], gear: sel.eq === 'cb' || sel.eq === 'bd' ? [{ k: sel.eq === 'bd' ? 'band' : 'cable', from: { x: -14, y: -6 } }] : sel.eq === 'mc' ? [{ k: 'armpads', z: 'front' }] : held(sel.eq), lab: UP }),
  'front-raise': sel => ({ frames: [st({ a1: 88, a2: 88 }), st({ a1: -10, a2: -10 })], gear: sel.eq === 'cb' || sel.eq === 'bd' ? [{ k: sel.eq === 'bd' ? 'band' : 'cable', from: { x: 30, y: -6 } }] : held(sel.eq), lab: UP }),
  'y-raise': sel => {
    if (sel.pos !== 'stand') { // chest on an incline bench, straight arms from hanging to overhead in line with the body
      const C = chestRow('db'), b = { ...C.frames[0], ax: null, ay: null }
      return { ...C, frames: [{ ...b, a1: 92, a2: 92 }, { ...b, a1: -26, a2: -28 }], gear: held(sel.eq === 'pl' ? 'pl' : 'db'), lab: UP }
    }
    return { view: 'f', frames: [st({ a1: 80, a2: 82 }), st({ a1: -55, a2: -58 })], gear: held(sel.eq === 'db' || sel.eq === 'pl' ? sel.eq : 'db'), lab: UP }
  },
  'upright-row': sel => { const b = st({}), S = shoulderOf(b); return { frames: [{ ...b, ax: S.x + 10, ay: S.y + 82 }, { ...b, ax: S.x + 14, ay: S.y - 6, ab: -1 }], gear: sel.eq === 'cb' || sel.eq === 'bd' ? [{ k: sel.eq === 'bd' ? 'band' : 'cable', from: { x: 30, y: -6 } }] : held(sel.eq), lab: ['Podciągnij', 'Opuść'] } },
  'pike-push-up': sel => {
    if (sel.v === 'hspu') { const mk = hy => ({ hx: 40, hy, t: 90, l1: -90, l2: -90, ax: 46, ay: -4, ab: 1 }); return { frames: [mk(-178), mk(-132)], props: [{ k: 'wall', x: 70 }], lab: PRESS } }
    // inverted V on the toes: arms straight in line with the back, then the head drops between the hands, elbows go back
    const mk = (hx, hy, t, ab) => ({ hx, hy, t, fx: -40, fy: -15, fo: 110, ax: 100, ay: -4, ab })
    return { frames: [mk(-6, -134, 51, 1), mk(48, -120, 60, 1)], lab: PRESS }
  },
  'cuban-press': sel => {
    const b = st({}), S = shoulderOf(b)
    return { frames: [{ ...b, ax: S.x + 8, ay: S.y + 82 }, { ...b, ax: S.x + 14, ay: S.y + 2, ab: -1 }, { ...b, ax: S.x + 10, ay: S.y - 40, ab: -1 }, { ...b, ax: S.x + 4, ay: S.y - 86 }], gear: held(sel.eq), ph: [...seq(['Podciągnij', 'Obróć w górę', 'Wypchnij'], 900), [1200, 'Opuść', 1, 0]] }
  },
  'ext-rotation': sel => (sel.eq === 'cb' || sel.eq === 'bd' ? { view: 'f', frames: [st({ a1: 92, a2: 178, ff: 0.75, b1: 90, b2: 90 }), st({ a1: 92, a2: 270, ff: 0.12, b1: 90, b2: 90 }), st({ a1: 92, a2: 360, ff: 0.75, b1: 90, b2: 90 })], props: sel.eq === 'cb' ? [tower(-160, -300, -150)] : [], gear: [{ k: sel.eq === 'bd' ? 'band' : 'cable', from: { x: -160, y: -150 } }], lab: ['Obróć na zewnątrz', 'Wróć'] } : { view: 'f', frames: [{ hx: 60, hy: -22, t: 180, l1: 0, l2: 0, ra1: 180, ra2: 270, b1: 200, b2: 200 }, { hx: 60, hy: -22, t: 180, l1: 0, l2: 0, ra1: 180, ra2: 90, b1: 200, b2: 200 }], gear: held(sel.eq === 'cb' || sel.eq === 'bd' ? 'db' : sel.eq), lab: ['Obróć na zewnątrz', 'Wróć'] }),

  // ---------- arms ----------
  curl: sel => {
    const pos = sel.eq === 'mc' ? 'preacher' : sel.pos || 'stand'
    let b = st({}), props = []
    if (pos === 'seat' || pos === 'conc') { b = seat({}); props = [SEAT_PROP] }
    if (pos === 'incline') { b = { hx: 30, hy: -74, t: -130, l1: 0, l2: 90 }; props = [SEAT_PROP, { k: 'pad', x1: 8, y1: -52, x2: -54, y2: -136, w: 14 }] }
    if (pos === 'chest') { b = { hx: -40, hy: -96, t: -34, fx: 20, fy: -7 }; const S = shoulderOf(b); return { frames: [{ ...b, a1: 92, a2: 92 }, { ...b, a1: 88, a2: -70 }], props: [{ k: 'pad', x1: -46, y1: -84, x2: S.x + 8, y2: S.y + 20, w: 14 }, { k: 'post', x: -10, y2: -84 }, { k: 'pad', x1: -66, y1: -84, x2: -20, y2: -84, w: 10 }], gear: held(sel.eq === 'cb' || sel.eq === 'mc' ? 'db' : sel.eq), lab: ['Zegnij', 'Opuść'] } }
    if (pos === 'preacher') { b = seat({ t: -80 }); const S = shoulderOf(b), o = { x: -8, y: 9 }; props = [SEAT_PROP, { k: 'pad', x1: S.x + 4 + o.x, y1: S.y + 3 + o.y, x2: S.x + 40 + o.x, y2: S.y + 32 + o.y, w: 12 }, { k: 'post', x: S.x + 30, y2: S.y + 40 }]; return { frames: [{ ...b, a1: 40, a2: 40 }, { ...b, a1: 40, a2: -80 }], props, gear: sel.eq === 'mc' ? [{ k: 'lever', pivot: 'elbow' }, { k: 'handle' }] : held(sel.eq === 'cb' ? 'bb' : sel.eq), lab: ['Zegnij', 'Opuść'] } }
    if (pos === 'behind') { // Bayesian: facing away from a low-mid pulley, the arm trails behind the body
      b = st({ fx: 22, gx: -18, gy: -7 }); const from = { x: -130, y: -70 }
      return { frames: [{ ...b, a1: 112, a2: 112 }, { ...b, a1: 108, a2: -40 }], props: [tower(-136, -110, from.y)], gear: [{ k: sel.eq === 'bd' ? 'band' : 'cable', from }], lab: ['Zegnij', 'Opuść'] }
    }
    if (pos === 'overhead') { // between two high pulleys, arms out to the sides, hands curl to the head (front view)
      b = st({ fx: 26, fy: -7 }); const S = shoulderOf(b), from = { x: 160, y: S.y - 10 }, from2 = { x: -160, y: S.y - 10 }
      return { view: 'f', frames: [{ ...b, a1: -4, a2: -4 }, { ...b, a1: -6, a2: -120 }], props: [tower(166, -300, from.y), tower(-166, -300, from.y)], gear: [{ k: 'cable', from, from2, both: true }], lab: ['Zegnij', 'Opuść'] }
    }
    const a1 = pos === 'incline' ? 96 : 88
    return { frames: [{ ...b, a1, a2: a1 }, { ...b, a1: a1 - 6, a2: -60 }], props: [...props, ...(sel.eq === 'cb' ? [tower(90, -40, -30)] : [])], gear: sel.eq === 'cb' ? [{ k: 'cable', from: { x: 90, y: -30 } }] : sel.eq === 'bd' ? [{ k: 'band', from: { x: 10, y: -6 } }] : held(sel.eq === 'mc' ? 'db' : sel.eq), lab: ['Zegnij', 'Opuść'] }
  },
  pushdown: sel => { const b = st({ t: -84 }); return { frames: [{ ...b, a1: 94, a2: -40 }, { ...b, a1: 94, a2: 90 }], props: [tower(80, -320)], gear: [{ k: sel.eq === 'bd' ? 'band' : 'cable', from: { x: 80, y: -312 } }], lab: ['Wyprostuj', 'Wróć'] } },
  'overhead-ext': sel => {
    const cable = sel.eq === 'cb'
    const b = sel.pos === 'seat' ? seat({}) : st(cable ? { t: -72, fx: 30, gx: -40, gy: -7 } : {})
    const up = b.t - 6
    return { frames: [{ ...b, a1: up, a2: up + 196 }, { ...b, a1: up, a2: up + 4 }], props: [...(sel.pos === 'seat' ? [SEAT_PROP, BACKREST] : []), ...(cable ? [tower(-120, -60, -40)] : [])], gear: cable ? [{ k: 'cable', from: { x: -120, y: -40 } }] : held(sel.eq === 'mc' ? 'db' : sel.eq), lab: ['Wyprostuj', 'Opuść'] }
  },
  'skull-crusher': sel => { const L = benchLike(sel); const b = L.frames[0], up = -100 + (b.t - 180); return { frames: [{ ...b, ax: undefined, ay: undefined, a1: up, a2: up }, { ...b, ax: undefined, ay: undefined, a1: up, a2: up - 110 }], props: L.props, gear: held(sel.eq === 'cb' ? 'bb' : sel.eq), lab: ['Opuść', 'Wyprostuj'] } },
  'tate-press': sel => { // elbows out to the sides (towards the viewer): forearms turn from the chest up to straight arms
    const L = benchLike(sel), p = { ...L.frames[0], ax: null, ay: null, ra1: 90 }
    return { frames: [{ ...p, af: 0.4, ra2: -60, ff: 0.35 }, { ...p, af: 0.6, ra2: 10, ff: 0.25 }, { ...p, af: 1, ra2: 90, ff: 1 }], props: L.props, gear: held('db'), lab: ['Wyprostuj', 'Opuść'] }
  },
  kickback: sel => { const b = { hx: -40, hy: -146, t: -8, fx: -62, fy: -7, gx: -104, gy: -94, bx: 50, by: -98, bb: 1 }; return { frames: [{ ...b, a1: 165, a2: 92 }, { ...b, a1: 168, a2: 176 }], props: [{ k: 'bench', x: -20, y: -100, len: 200, legs: [-0.8, 0.8] }], gear: held(sel.eq === 'cb' ? 'db' : sel.eq), lab: ['Wyprostuj', 'Wróć'] } },
  'dip-machine': () => { const b = seat({}); return { frames: [{ ...hand(b, 4, 30), ab: 1 }, { ...hand(b, 6, 86), ab: 1 }], props: [SEAT_PROP, BACKREST], gear: [{ k: 'lever', pivot: { x: shoulderOf(b).x - 60, y: shoulderOf(b).y + 20 } }, { k: 'handle' }], lab: ['Wypchnij w dół', 'Wróć'] } },
  'jm-press': () => { const b = lie({}); return { frames: [hand(b, 6, -86), { ...hand(b, -6, -30), ab: 1 }], props: [FLAT_BENCH], gear: [{ k: 'bb', z: 'back' }], lab: PRESS } },
  'bench-dip': sel => {
    const mk = hy => ({ hx: -18, hy, t: -84, l1: 6, l2: 80, fx: 130, fy: -7, ax: -32, ay: -70, ab: -1 })
    return { frames: [mk(-80), mk(-44)], props: [{ k: 'bench', x: -60, y: -70, len: 90 }], gear: sel.eq === 'pl' ? [{ k: 'pl', at: 'hold' }] : [], lab: PRESS }
  },
  'wrist-curl': sel => { const b = seat({ t: -70 }); return { frames: [{ ...b, a1: 60, a2: 4 }, { ...b, a1: 60, a2: -14 }], props: [SEAT_PROP], gear: held(sel.eq === 'cb' ? 'db' : sel.eq), lab: ['Zegnij nadgarstki', 'Opuść'] } },
  'forearm-rotation': () => { const b = seat({ t: -80 }); return { frames: [{ ...b, a1: 60, a2: 0, rot: -60 }, { ...b, a1: 60, a2: 0, rot: 60 }], props: [SEAT_PROP], gear: [{ k: 'dbrot' }], lab: ['Obróć', 'Obróć z powrotem'] } },
  gripper: () => { const b = st({}); return { frames: [{ ...b, a1: 80, a2: 0, sq: 0 }, { ...b, a1: 80, a2: 0, sq: 1 }], gear: [{ k: 'grip' }], lab: ['Ściśnij', 'Puść'] } },
  'wrist-roller': () => { const b = st({}); return { frames: [{ ...b, a1: 0, a2: 0, rl: 120 }, { ...b, a1: 0, a2: 0, rl: 30 }], gear: [{ k: 'roller' }], lab: ['Nawijaj', 'Odwijaj'] } },
  'plate-pinch': () => ({ frames: [st({}), st({ hy: -143 })], gear: [{ k: 'pl', both: true }], ph: holdPh }),
  farmer: sel => ({ frames: [st({ fx: 30, gx: -22, gy: -7, hy: -141 }), st({ fx: -22, gx: 30, gy: -7, hy: -141 })], gear: held(sel.eq === 'hx' ? 'bb' : sel.eq), lab: ['Idź', 'Idź'] }),

  // ---------- legs ----------
  squat: sel => {
    const v = sel.v || 'back'
    const hold = { back: 'back', front: 'rack', zercher: 'chest', box: 'back', overhead: 'up' }[v]
    const deep = v === 'box' ? -74 : -66
    if (v === 'zercher') { // bar in the crook of the elbows, hands up by the chest
      const top = st({ fx: 10, ra1: 152, ra2: -18 }), bot = { ...top, hx: -34, hy: deep, t: -62 }
      return { frames: [top, bot], gear: [{ k: 'bb', at: 'elbow' }], lab: SQ }
    }
    if (v === 'front') { // front rack: elbows high and forward, bar on the front of the shoulders
      const top = st({ fx: 10, ra1: 86, ra2: -80 }), bot = { ...top, hx: -34, hy: deep, t: -68 }
      return { frames: [top, bot], gear: [{ k: 'bb' }], lab: SQ }
    }
    const top = st({ hold, ab: v === 'overhead' ? 1 : -1, fx: 10 })
    const bot = { ...top, hx: v === 'front' || v === 'overhead' ? -34 : -46, hy: deep, t: v === 'front' || v === 'overhead' ? -68 : -54 }
    return { frames: [top, bot], props: v === 'box' ? [{ k: 'box', x: -60, w: 44, h: 50 }] : [], gear: [{ k: 'bb', at: 'hold' }], lab: SQ }
  },
  'goblet-squat': sel => {
    const sides = sel.v === 'sides'
    const top = sides ? st({ fx: 10 }) : st({ hold: 'chest', hox: 6, ab: -1, fx: 10 })
    return { frames: [top, { ...top, hx: -40, hy: -66, t: -64 }], gear: sides ? held(sel.eq) : [{ k: sel.eq === 'kb' ? 'kb' : 'db', at: 'hold' }], lab: SQ }
  },
  'hack-squat': sel => {
    if (sel.eq === 'bb') return { frames: [{ hx: -26, hy: -86, t: -64, fx: 14, fy: -7, ax: -16, ay: -28, ab: 1 }, st({ ax: -12, ay: -66, ab: 1 })], gear: [{ k: 'bb', z: 'back' }], lab: ['Wstań', 'Opuść'] }
    const mk = (hx, hy) => ({ hx, hy, t: -112, fx: 50, fy: -36, a1: 0, a2: -80, ra1: 190, ra2: 100 })
    return { frames: [mk(-10, -158), mk(-50, -76)], props: [{ k: 'line', x1: -96, y1: -6, x2: -40, y2: -300, w: 6 }, { k: 'pad', x1: 26, y1: -30, x2: 80, y2: -40, w: 9 }], gear: [{ k: 'backpad', z: 'back' }], lab: SQ }
  },
  pendulum: () => {
    const mk = (hx, hy, t) => ({ hx, hy, t, fx: 46, fy: -30, ra1: 150, ra2: -40 })
    return { frames: [mk(-6, -160, -98), mk(-46, -84, -108)], props: [{ k: 'pad', x1: 24, y1: -26, x2: 76, y2: -36, w: 9 }, { k: 'line', x1: -150, y1: 0, x2: -150, y2: -320, w: 8 }], gear: [{ k: 'lever', pivot: { x: -150, y: -300 }, to: 'shoulder' }, { k: 'backpad', z: 'back' }], lab: SQ }
  },
  'belt-squat': () => ({ frames: [st({ a1: 20, a2: 20 }), st({ hx: -30, hy: -70, t: -78, a1: 20, a2: 20 })], gear: [{ k: 'belt' }], lab: SQ }),
  'leg-press': sel => {
    const hi = sel.v === 'high' ? -10 : sel.v === 'low' ? 10 : 0
    const mk = r => { const base = { x: 52, y: -66 }, f = { x: base.x + Math.cos(-45 * Math.PI / 180) * r, y: base.y + Math.sin(-45 * Math.PI / 180) * r + hi }; return { hx: 0, hy: -40, t: 200, fx: f.x, fy: f.y, lb: -1, a1: 30, a2: 0, fo: -135 } }
    return { frames: [mk(20), mk(84)], props: [{ k: 'pad', x1: 4, y1: -20, x2: -96, y2: -56, w: 14 }, { k: 'pad', x1: -6, y1: -22, x2: 40, y2: -22, w: 10 }, { k: 'post', x: -40, y2: -36 }], gear: [{ k: 'plat', ang: -45 }], lab: ['Wypchnij', 'Opuść'] }
  },
  lunge: sel => {
    const v = sel.v || 'fwd'
    const top = st({ fx: 6, gx: 6, gy: -7 })
    const bot = v === 'rev' ? { ...top, hx: -18, hy: -84, t: -88, fx: 38, gx: -92, gy: -8, fo2: 30 } : v === 'side' ? { ...top, hx: -10, hy: -96, t: -70 } : { ...top, hx: 30, hy: -84, t: -90, fx: 86, gx: -44, gy: -8, fo2: 30 }
    const onBack = (sel.eq === 'bb' || sel.eq === 'sm') && v !== 'side', bk = f => (onBack ? { ...f, hold: 'back', ab: -1 } : f)
    return { view: v === 'side' ? 'f' : undefined, frames: v === 'side' ? [st({ fx: 40, fy: -7 }), { hx: 30, hy: -92, t: -86, fx: 60, fy: -7, l1: 0, l2: 0, gx: -60, gy: -7, gb: 1, a1: 90, a2: 90 }] : [bk(top), bk(bot)], gear: onBack ? [{ k: 'bb', at: 'hold' }] : held(sel.eq === 'sm' ? 'bb' : sel.eq), lab: SQ }
  },
  'split-squat': sel => {
    const v = sel.v || 'bulgarian'
    const rear = v === 'bulgarian' ? { gx: -96, gy: -52, fo2: 0 } : { gx: -82, gy: -10, fo2: 30 }
    // front shin stays about vertical, the back knee drops straight down towards the floor, chest up with a slight lean
    const front = v === 'front' ? { fx: 54, fy: -30 } : { fx: 50, fy: -7 }
    const top = { hx: -8, hy: -128, t: -84, ...front, ...rear, a1: 90, a2: 90 }
    const onBack = sel.eq === 'bb' || sel.eq === 'sm', bk = f => (onBack ? { ...f, hold: 'back', ab: -1 } : f)
    return { frames: [bk(top), bk({ ...top, hy: v === 'front' ? -92 : -74, hx: -16, t: -80 })], props: v === 'bulgarian' ? [{ k: 'bench', x: -110, y: -54, len: 70 }] : v === 'front' ? [{ k: 'box', x: 74, w: 40, h: 24 }] : [], gear: onBack ? [{ k: 'bb', at: 'hold' }] : held(sel.eq === 'sm' ? 'bb' : sel.eq), lab: SQ }
  },
  'step-up': sel => {
    const box = { x: 54, h: 46 }
    return { frames: [{ hx: 0, hy: -110, t: -86, fx: box.x, fy: -box.h - 7, gx: -40, gy: -7, a1: 90, a2: 90 }, { hx: 44, hy: -box.h - 140, t: -90, fx: box.x, fy: -box.h - 7, gx: box.x + 8, gy: -box.h - 40, a1: 90, a2: 90 }], props: [{ k: 'box', x: box.x + 6, w: 70, h: box.h }], gear: held(sel.eq), lab: ['Wejdź', 'Zejdź'] }
  },
  'leg-extension': () => { const b = seat({ t: -96 }); return { frames: [{ ...b, l2: 95 }, { ...b, l2: -6 }], props: [SEAT_PROP, BACKREST, { k: 'pad', x1: 34, y1: -93, x2: 62, y2: -93, w: 10 }], gear: [{ k: 'lever', pivot: 'knee', to: 'roller' }, { k: 'shin' }], lab: ['Wyprostuj', 'Opuść'] } },
  'sissy-squat': () => ({ frames: [st({ fx: 10, a1: 20, a2: 20 }), { hx: 30, hy: -70, t: -132, fx: 10, fy: -9, a1: 20, a2: 20, fo: 30 }], lab: SQ }),
  'wall-sit': sel => { const p = { hx: -40, hy: -76, t: -90, fx: 30, fy: -7, a1: 90, a2: 90 }; return { frames: [p, { ...p, hy: -75 }], props: [{ k: 'wall', x: -54 }], gear: sel.eq === 'db' ? held('db') : sel.eq === 'pl' ? [{ k: 'pl', at: 'hold' }] : [], ph: holdPh } },
  pistol: sel => {
    const top = { hx: 0, hy: -144, t: -90, fx: 6, fy: -7, m1: 60, m2: 60, a1: 0, a2: 0 }
    return { frames: [top, { ...top, hx: -34, hy: -60, t: -64, m1: -8, m2: -4 }], props: sel.v === 'box' ? [{ k: 'box', x: -50, w: 40, h: 48 }] : [], gear: sel.eq === 'bw' ? [] : [{ k: sel.eq === 'kb' ? 'kb' : 'db' }], lab: SQ }
  },
  cossack: sel => ({ view: 'f', frames: [{ hx: 0, hy: -122, t: -90, fx: 64, fy: -7, gx: -64, gy: -7, a1: 70, a2: 10 }, { hx: 44, hy: -62, t: -80, fx: 64, fy: -7, gx: -80, gy: -7, gb: 1, a1: 70, a2: 10 }], gear: sel.eq === 'bw' ? [] : [{ k: sel.eq, at: 'hold' }], lab: ['Przenieś ciężar', 'Wróć'] }),
  'reverse-nordic': () => {
    const K = { x: 0, y: -10 }, mk = a => { const H = { x: K.x + Math.cos(a * Math.PI / 180) * 70, y: K.y + Math.sin(a * Math.PI / 180) * 70 }; return { hx: H.x, hy: H.y, t: a, fx: -66, fy: -7, lb: 1, a1: a + 120, a2: a + 120 } }
    return { frames: [mk(-90), mk(-130)], lab: ['Odchyl się', 'Wróć'] }
  },
  'tibialis-raise': () => ({ frames: [{ hx: -30, hy: -144, t: -90, fx: 14, fy: -7, a1: 90, a2: 90, fo: 0 }, { hx: -30, hy: -144, t: -90, fx: 14, fy: -7, a1: 90, a2: 90, fo: -30 }], props: [{ k: 'wall', x: -46 }], lab: ['Unieś palce', 'Opuść'] }),
  'calf-raise': sel => {
    if (sel.pos === 'seat') { const b = seat({ l1: null, l2: null }); return { frames: [{ ...b, fx: 60, fy: -18, fo: -8 }, { ...b, fx: 62, fy: -31, fo: 40 }], props: [SEAT_PROP, { k: 'box', x: 76, w: 22, h: 16 }], gear: [{ k: 'kneepad' }], lab: ['Wspięcie', 'Opuść'] } }
    if (sel.pos === 'legpress') { const L = LIB['leg-press']({}), [, top] = L.frames; return { ...L, frames: [{ ...top, fo: -150 }, { ...top, fx: top.fx + 7, fy: top.fy - 7, fo: -100 }], lab: ['Wspięcie', 'Opuść'] } }
    if (sel.pos === 'donkey') { const b = { hx: -40, hy: -144, t: -4, fx: -30, fy: -19, a1: 92, a2: 92 }; return { frames: [{ ...b, fo: 8 }, { ...b, hy: -156, fy: -31, fo: 38 }], props: [{ k: 'box', x: -22, w: 50, h: 12 }, { k: 'pad', x1: 30, y1: -62, x2: 80, y2: -62, w: 10 }, { k: 'post', x: 60, y2: -62 }, { k: 'pad', x1: -60, y1: -160, x2: -20, y2: -160, w: 12 }], lab: ['Wspięcie', 'Opuść'] } }
    const heavy = sel.eq === 'bb' || sel.eq === 'sm' || sel.eq === 'mc'
    const h = heavy ? { hold: 'back', ab: -1 } : {}
    return { frames: [st({ fo: 10, ...h }), st({ hy: -158, fy: -20, fo: 36, ...h })], props: [{ k: 'box', x: 14, w: 50, h: 12 }], gear: heavy ? [{ k: 'bb', at: 'hold' }] : held(sel.eq), lab: ['Wspięcie', 'Opuść'] }
  },

  // ---------- posterior chain ----------
  deadlift: sel => {
    // start: hips just above the knees, shoulders over the bar, arms straight down to the bar on the floor
    const def = sel.v === 'deficit', rack = sel.v === 'rack'
    const bot = { hx: -50, hy: def ? -74 : -86, t: def ? -20 : -26, fx: 8, fy: def ? -19 : -7, a1: 90, a2: 90 }
    const top = st({ fx: 8 })
    const props = def ? [{ k: 'box', x: 4, w: 60, h: 12 }] : rack ? [{ k: 'line', x1: 22, y1: 0, x2: 22, y2: -76, w: 6 }, { k: 'line', x1: 12, y1: -76, x2: 32, y2: -76, w: 5 }] : []
    return { frames: [rack ? { ...top, hx: -40, hy: -126, t: -40 } : bot, top], props, gear: held(sel.eq, sel.eq === 'bb' || sel.eq === 'hx' ? { r: 20 } : {}), lab: ['Wstań', 'Opuść'] }
  },
  rdl: sel => {
    const single = sel.v === 'single'
    const top = st({ fx: 8 })
    const bot = single ? { ...top, hx: -24, hy: -134, t: -6, m1: 172, m2: 174 } : { ...top, hx: -40, hy: -132, t: -14 }
    return { frames: [single ? { ...top, m1: 96, m2: 98 } : top, bot], gear: held(sel.eq === 'sm' ? 'bb' : sel.eq), lab: ['Pochyl', 'Wyprostuj'] }
  },
  'leg-curl': sel => {
    const r = legCurl(sel)
    // cable: ankle strap on a low pulley; dumbbell: held between the feet
    if (sel.eq === 'cb') { const from = sel.pos === 'lying' ? { x: 230, y: -60 } : sel.pos === 'stand' ? { x: 70, y: -14 } : { x: 170, y: -20 }; return { ...r, gear: [{ k: 'cable', from, at: 'foot' }], props: [...r.props.filter(p => p.k !== 'pad' || sel.pos !== 'stand'), { k: 'tower', x: from.x + 6, top: -200, pulley: from.y }] } }
    if (sel.eq === 'db') return { ...r, gear: [{ k: 'db', at: 'foot' }] }
    return r
  },
  nordic: () => {
    // kneeling on a pad, ankles held behind; one straight line knees → head tips forward, hands catch the floor at the end
    const K = { x: 0, y: -12 }, R = Math.PI / 180
    const mk = (a, catchIt) => { const H = { x: K.x + Math.cos(a * R) * 70, y: K.y + Math.sin(a * R) * 70 }; return { hx: H.x, hy: H.y, t: a, l1: a + 180, l2: 180, fo: 200, ...(catchIt ? { ax: H.x + 128, ay: -6, ab: 1 } : { hold: 'chest' }) } }
    return { frames: [mk(-88), mk(-58), mk(-30), mk(-16, true)], props: [{ k: 'pad', x1: -16, y1: -4, x2: 16, y2: -4, w: 8 }, { k: 'pad', x1: -74, y1: -23, x2: -54, y2: -23, w: 11 }, { k: 'post', x: -64, y2: -23 }], ph: [[2800, 'Opuszczaj powoli', 0, 1], [1500, 'Wróć', 1, 0]] }
  },
  'glute-ham': () => {
    const K = { x: 0, y: -70 }, mk = a => { const H = { x: K.x + Math.cos(a * Math.PI / 180) * 70, y: K.y + Math.sin(a * Math.PI / 180) * 70 }; return { hx: H.x, hy: H.y, t: a, fx: -64, fy: -64, lb: 1, a1: a + 160, a2: a + 160 } }
    return { frames: [{ ...mk(-6), hold: 'chest' }, { ...mk(-80), hold: 'chest' }], props: [{ k: 'pad', x1: -10, y1: -60, x2: 20, y2: -60, w: 14 }, { k: 'post', x: 0, y2: -60 }, { k: 'pad', x1: -76, y1: -84, x2: -76, y2: -48, w: 8 }, { k: 'pad', x1: -62, y1: -78, x2: -56, y2: -78, w: 12 }, { k: 'post', x: -76, y2: -48 }], lab: ['Zegnij', 'Opuść'] }
  },
  'hip-thrust': sel => {
    const Sx = -50, Sy = -56
    const mk = (hx, hy) => { const t = Math.atan2(Sy - hy, Sx - hx) * 180 / Math.PI; return { hx, hy, t, fx: 56, fy: -7, hold: 'hip', ab: 1 } }
    return { frames: [mk(-8, -24), mk(10, -62)], props: [{ k: 'bench', x: -86, y: -50, len: 80 }], gear: sel.eq === 'bw' || sel.eq === 'bd' ? [] : [{ k: sel.eq === 'db' ? 'db' : 'bb', at: 'hold' }], lab: ['Wypchnij biodra', 'Opuść'] }
  },
  'glute-bridge': sel => {
    const Sx = -68, Sy = -13
    const mk = (hx, hy) => { const t = Math.atan2(Sy - hy, Sx - hx) * 180 / Math.PI; return { hx, hy, t, fx: 50, fy: -7, ...(sel.eq === 'bw' || sel.eq === 'bd' ? { a1: 0, a2: 0, ra1: 180, ra2: 180 } : { hold: 'hip', ab: 1 }) } }
    return { frames: [mk(10, -14), mk(14, -50)], gear: sel.eq === 'bw' || sel.eq === 'bd' ? [] : [{ k: sel.eq === 'db' ? 'db' : 'bb', at: 'hold' }], lab: ['Wypchnij biodra', 'Opuść'] }
  },
  'glute-kickback': sel => {
    const b = { hx: 0, hy: -72, t: 0, m1: 90, m2: 180, fo2: 180, ax: 84, ay: -4, ab: -1 }
    return { frames: [{ ...b, l1: 120, l2: 180 }, { ...b, l1: 190, l2: 185 }], props: sel.eq === 'cb' ? [tower(-150, -40, -20)] : [], gear: sel.eq === 'cb' ? [{ k: 'cable', from: { x: -150, y: -20 }, at: 'foot' }] : sel.eq === 'bd' ? [{ k: 'band', from: { x: 70, y: -6 }, at: 'foot' }] : sel.eq === 'mc' ? [{ k: 'shin', side: -1 }] : [], lab: ['Wypchnij nogę', 'Wróć'] }
  },
  'hip-abduction': sel => {
    const pos = sel.pos || (sel.eq === 'mc' ? 'seat' : 'stand')
    if (pos === 'seat') { const b = { ...FSEAT, tf: 0.35, a1: 80, a2: 84 }; return { view: 'f', frames: [{ ...b, l1: 90, l2: 90 }, { ...b, l1: 12, l2: 72 }], props: FSEAT_PROPS, lab: ['Rozsuń', 'Złącz'] } }
    if (pos === 'stand') { const b = st({ fx: null, fy: null, m1: 90, m2: 90, a1: 84, a2: 84 }); return { view: 'f', frames: [{ ...b, l1: 90, l2: 90 }, { ...b, l1: 58, l2: 58 }], props: sel.eq === 'cb' ? [tower(-150, -40, -20)] : [], lab: UP } }
    return { view: 'f', frames: [{ hx: 0, hy: -20, t: 180, l1: 0, l2: 0, m1: 0, m2: 0, a1: 0, a2: 0, b1: 120, b2: 90 }, { hx: 0, hy: -20, t: 180, l1: -36, l2: -36, m1: 0, m2: 0, a1: 0, a2: 0, b1: 120, b2: 90 }], lab: UP }
  },
  'hip-adduction': sel => {
    if (sel.eq === 'cb') { const b = st({ fx: null, fy: null, m1: 90, m2: 90, a1: 84, a2: 84 }); return { view: 'f', frames: [{ ...b, l1: 72, l2: 72 }, { ...b, l1: 100, l2: 100 }], props: [tower(150, -40, -20)], lab: ['Przyciągnij', 'Wróć'] } }
    const b = { ...FSEAT, tf: 0.35, a1: 80, a2: 84 }
    return { view: 'f', frames: [{ ...b, l1: 12, l2: 72 }, { ...b, l1: 90, l2: 90 }], props: FSEAT_PROPS, lab: ['Złącz', 'Rozsuń'] }
  },
  'kb-swing': sel => {
    const bot = { hx: -40, hy: -118, t: -30, fx: 6, a1: 110, a2: 120 }
    return { frames: [bot, st({ fx: 6, a1: 0, a2: 0 })], gear: [{ k: sel.eq === 'db' ? 'db' : 'kb', up: true }], lab: ['Wypchnij biodra', 'Zamach w dół'] }
  },
  'pull-through': sel => {
    const bot = { hx: -40, hy: -118, t: -30, fx: 6, a1: 104, a2: 110 }
    return { frames: [bot, st({ fx: 6, a1: 96, a2: 96 })], props: [tower(-150, -40, -20)], gear: [{ k: sel.eq === 'bd' ? 'band' : 'cable', from: { x: -150, y: -20 } }], lab: ['Wypchnij biodra', 'Pochyl'] }
  },
  'reverse-hyper': () => { const b = { hx: 0, hy: -150, t: 0, a1: 72, a2: 90 }; return { frames: [{ ...b, l1: 98, l2: 98 }, { ...b, l1: 178, l2: 180 }], props: [{ k: 'pad', x1: 0, y1: -138, x2: 90, y2: -138, w: 13 }, { k: 'post', x: 40, y2: -132 }], lab: UP } },

  // ---------- core ----------
  crunch: sel => {
    if (sel.eq === 'mc') { // seated crunch machine: hands on the handles by the head, the trunk curls forward
      const b = seat({ t: -88, ax: null, a1: -60, a2: 160 }), S = shoulderOf(b)
      return { frames: [{ ...b, cu: 0.1 }, { ...b, t: -40, cu: 1, hd: 20 }], props: [SEAT_PROP], gear: [{ k: 'lever', pivot: { x: S.x - 30, y: S.y - 60 }, to: 'shoulder' }, { k: 'pad', at: 'shoulder' }], lab: ['Spięcie', 'Wróć'] }
    }
    if (sel.eq === 'cb' || sel.pos === 'kneel') { const b = { hx: 0, hy: -78, t: -64, l1: 92, l2: 180, fo: 180, hold: 'head', ab: -1, cu: 0.15 }; return { frames: [b, { ...b, hx: -6, hy: -74, t: 14, hd: 30, cu: 1 }], props: [tower(-60, -300)], gear: [{ k: 'cable', from: { x: -60, y: -292 } }], lab: ['Spięcie', 'Wróć'] } }
    const legsUp = sel.v === 'legsup'
    if (sel.pos === 'ball') { const b = { hx: 20, hy: -66, t: 186, hold: 'head', ab: 1, fx: 112, fy: -7 }; return { frames: [b, { ...b, t: 216, cu: 0.9 }], props: [{ k: 'ball', x: -10, y: -34, r: 34 }], lab: ['Spięcie', 'Wróć'] } }
    const b = { hx: 30, hy: -13, t: 180, hold: 'head', ab: 1, ...(legsUp ? { l1: -90, l2: 0 } : { fx: 86, fy: -7 }) }
    return { frames: [b, { ...b, t: 218, cu: 1 }], lab: ['Spięcie', 'Wróć'] }
  },
  'oblique-crunch': () => { const b = { hx: 30, hy: -13, t: 180, hold: 'head', ab: 1, fx: 86, fy: -7 }; return { frames: [b, { ...b, t: 212, hd: -10, cu: 0.9 }], lab: ['Spięcie', 'Wróć'] } },
  'sit-up': () => { const b = { hx: 30, hy: -13, fx: 86, fy: -7, ra1: 150, ra2: 160 }; return { frames: [{ ...b, t: 180 }, { ...b, t: 250, cu: 0.5 }], lab: ['Usiądź', 'Połóż się'] } },
  'leg-raise': sel => {
    const v = sel.v || 'bent'
    if (sel.pos === 'lying' || sel.pos === 'incline') { const b = { hx: 0, hy: -13, t: 180, a1: 0, a2: 0 }; return { frames: [{ ...b, l1: -6, l2: -6 }, { ...b, l1: -88, l2: v === 'bent' ? 0 : -88 }], lab: UP } }
    if (sel.pos === 'captain') { const b = { hx: 0, hy: -170, t: -90, a1: 90, a2: 0, b1: 90, b2: 0 }; return { frames: [{ ...b, l1: 92, l2: 92 }, { ...b, l1: v === 'straight' ? 0 : -20, l2: v === 'straight' ? 0 : 80, cu: 0.6 }], props: [{ k: 'pad', x1: -22, y1: -150, x2: -22, y2: -262, w: 12 }, { k: 'pad', x1: -6, y1: -200, x2: 46, y2: -200, w: 9 }, { k: 'post', x: -24, y2: -150 }], lab: UP } }
    const bar = { x: 6, y: -330 }, b = { hx: -2, hy: bar.y + 172, t: -90, ax: bar.x, ay: bar.y }
    const end = v === 't2b' ? { l1: -70, l2: -78, hx: -18, hy: bar.y + 168, t: -110 } : v === 'straight' ? { l1: 0, l2: 0 } : { l1: -24, l2: 84 }
    return { frames: [{ ...b, l1: 92, l2: 92 }, { ...b, ...end, cu: 0.6 }], props: [{ k: 'bar', x: bar.x, y: bar.y, side: -70 }], lab: UP }
  },
  plank: sel => {
    const v = sel.v || 'front'
    if (v === 'side') { const p = { hx: 0, hy: -40, t: 194, l1: 6, l2: 6, m1: 6, m2: 6, ax: -76, ay: -4, ab: -1, b1: -80, b2: -80 }; return { view: 'f', frames: [p, { ...p, hy: -42 }], ph: holdPh } }
    const fore = d => board(-122, -7, -10 + d, { ax: shoulderX(-122, -10) + 41, ay: -8, ab: 1 }) // on the forearms: elbow under the shoulder, forearm flat
    const high = (ex = {}) => board(-122, -7, -23, { ax: shoulderX(-122, -23), ay: -4, ab: -1, ...ex })
    if (v === 'updown') return { frames: [fore(0), high()], lab: ['Na dłonie', 'Na przedramiona'] }
    if (v === 'taps') { const p = high(); const S = shoulderOf(p); return { frames: [p, { ...p, ax: S.x - 2, ay: S.y + 14, ab: 1, bx: 83, by: -4, bb: -1 }], lab: ['Dotknij barku', 'Wróć'] } }
    return { frames: [fore(0), fore(-0.6)], ph: holdPh }
  },
  'ab-wheel': sel => {
    const knees = sel.v !== 'standing'
    const mk = (hx, hy, t, ax) => (knees ? { hx, hy, t, l1: 100, l2: 180, fo: 180, ax, ay: -18, ab: -1 } : { hx, hy, t, fx: -90, fy: -7, ax, ay: -18, ab: -1 })
    return { frames: [knees ? mk(-30, -62, -36, 36) : mk(-34, -122, 10, 47), knees ? mk(10, -50, -14, 150) : mk(10, -48, -10, 160)], gear: [{ k: sel.v === 'ball' ? 'ball' : 'wheel', dir: 90, off: 10 }], lab: ['Rozwiń', 'Wróć'] }
  },
  pallof: sel => { const b = sel.pos === 'kneel' ? { hx: 0, hy: -78, t: -90, l1: 90, l2: 180, fo: 180, m1: 0, m2: 90, a1: 90, a2: 90 } : st({ fx: 20, gx: -20, gy: -7 }); return { frames: [hand(b, 16, 40), hand(b, 86, 34)], props: [tower(-140, -300, -160)], gear: [{ k: sel.eq === 'bd' ? 'band' : 'cable', from: { x: -140, y: -160 } }], lab: ['Wypchnij', 'Wróć'] } },
  woodchop: sel => {
    const hl = sel.v === 'lowhigh'
    const b = st({ fx: 30, gx: -30, gy: -7 })
    const hi = hand(b, -40, -60), lo = hand({ ...b, hy: -132 }, 70, 70)
    return { frames: hl ? [lo, hi] : [hi, lo], props: [tower(hl ? 160 : -150, -310, hl ? -30 : -300)], gear: [{ k: sel.eq === 'bd' ? 'band' : 'cable', from: { x: hl ? 160 : -150, y: hl ? -30 : -300 } }], lab: ['Przeciągnij', 'Wróć'] }
  },
  'russian-twist': sel => { const b = { cu: 0.5, hx: 0, hy: -13, t: -130, l1: -40, l2: 20 }; return { frames: [hand(b, 46, 30), hand(b, 24, 50)], gear: sel.eq === 'bw' ? [] : [{ k: sel.eq === 'db' ? 'db' : 'pl' }], lab: ['Skręć', 'Skręć'] } },
  'side-bend': sel => ({ view: 'f', frames: [st({ fx: 12, gx: -12, a1: 90, a2: 90, b1: 90, b2: 90 }), st({ fx: 12, gx: -12, t: -74, a1: 90, a2: 90, b1: 90, b2: 90 })], gear: [{ k: sel.eq === 'cb' ? 'db' : sel.eq }], lab: ['Pochyl w bok', 'Wróć'] }),
  'knee-tuck': sel => {
    const v = sel.v || 'bench'
    const feetY = v === 'ball' ? -38 : v === 'trx' ? -40 : v === 'bench' ? -46 : -7
    const hand = shoulderX(-122, -23)
    const mk = (fx, hy, t, fy = feetY) => ({ hx: 0, hy, t, fx, fy, ax: hand, ay: -4, ab: -1 })
    if (v === 'pike') return { frames: [{ ...board(-122, -36, -16), ax: hand, ay: -4, ab: -1 }, mk(-100, -129, 26, -36)], gear: [{ k: 'ball', at: 'foot', dir: 90, off: 14, r: 22 }], lab: ['Unieś biodra', 'Wróć'] }
    return { frames: [{ ...board(-122, feetY, feetY < -20 ? -12 : -23), ax: hand, ay: -4, ab: -1 }, mk(v === 'bench' ? -96 : -50, -112, 14)], gear: v === 'ball' ? [{ k: 'ball', at: 'foot', dir: 90, off: 14, r: 22 }] : v === 'trx' ? [{ k: 'cable', from: { x: -100, y: -330 }, at: 'foot' }] : [], props: v === 'bench' ? [{ k: 'bench', x: -136, y: -40, len: 80 }] : [], lab: ['Przyciągnij kolana', 'Wróć'] }
  },
  flutter: () => { const b = { hx: 0, hy: -13, t: 180, a1: 0, a2: 0 }; return { frames: [{ ...b, l1: -12, l2: -12, m1: -32, m2: -32 }, { ...b, l1: -32, l2: -32, m1: -12, m2: -12 }], lab: ['Nożyce', 'Nożyce'] } },
  wipers: sel => {
    const leg = (a, k) => ({ l1: a, l2: a, m1: a, m2: a, tf: k, sf: k })
    if (sel.pos === 'hang') { // front view, hanging: legs up and swinging side to side
      const P = LIB['pull-up']({ eq: 'bw' }), b = { hx: 0, hy: -162, t: -90, ax: 38, ay: -330, ab: 1 }
      return { ...P, frames: [{ ...b, ...leg(-40, 0.45) }, { ...b, ...leg(-140, 0.45) }], ph: [[1100, 'Na bok', 0, 1], [300, 'Na bok', 1, 1], [1100, 'Na drugi bok', 1, 0], [300, 'Na drugi bok', 0, 0]] }
    }
    // lying on the back, seen from above: legs point up at the viewer and swing side to side
    const b = { hx: 0, hy: -150, t: -90, a1: 20, a2: 20 }
    return { view: 'f', top: true, frames: [{ ...b, ...leg(30, 0.35) }, { ...b, ...leg(150, 0.35) }], ph: [[1100, 'Na bok', 0, 1], [300, 'Na bok', 1, 1], [1100, 'Na drugi bok', 1, 0], [300, 'Na drugi bok', 0, 0]] }
  },
  'dragon-flag': () => { const b = { hx: 0, hy: -64, a1: 190, a2: -80, ax: -90, ay: -60, ab: 1 }; return { frames: [{ ...b, hx: -30, hy: -110, t: 160, l1: -70, l2: -70 }, { ...b, hx: 20, hy: -66, t: 180, l1: -8, l2: -8 }], props: [{ k: 'bench', x: -40, y: -50, len: 140 }], lab: ['Opuszczaj powoli', 'Unieś'] } },
  'l-sit': sel => {
    if (sel.v === 'hang') { const bar = { x: 8, y: -330 }, p = { hx: -2, hy: bar.y + 172, t: -90, l1: 0, l2: 0, ax: bar.x, ay: bar.y }; return { frames: [p, { ...p, hy: p.hy - 1 }], props: [{ k: 'bar', x: bar.x, y: bar.y, side: -70 }], ph: holdPh } }
    const bars = sel.v === 'bars', y = bars ? -100 : -4, p = { hx: 0, hy: y - 22, t: -90, l1: 0, l2: 0, ax: 8, ay: y, ab: -1 }
    return { frames: [p, { ...p, hy: p.hy - 2 }], props: bars ? [{ k: 'post', x: 8, y2: y }, { k: 'pad', x1: -10, y1: y, x2: 30, y2: y, w: 6 }] : [], ph: holdPh }
  },
  'mountain-climber': () => {
    const B = board(-122, -7, -23), hx = shoulderX(-122, -23)
    const mk = (fx, gx) => ({ hx: B.hx, hy: B.hy, t: B.t, fx, fy: -7, gx, gy: -7, ax: hx, ay: -4, ab: -1 })
    return { frames: [mk(-10, -122), mk(-122, -10)], lab: ['Kolano do klatki', 'Zmień nogę'] }
  },
  'heel-touch': () => { const b = { cu: 0.6, hx: 30, hy: -13, t: 196, fx: 86, fy: -7 }; return { frames: [{ ...b, a1: 12, a2: 12 }, { ...b, a1: 26, a2: 26 }], lab: ['Dotknij pięty', 'Druga strona'] } },
  'torso-rotation': () => ({ frames: [seat({ t: -86, hold: 'rack', ab: 1 }), seat({ t: -94, hold: 'rack', ab: 1 })], props: [SEAT_PROP, BACKREST], lab: ['Skręć', 'Wróć'] }),
  'stir-pot': () => { const p = { hx: 0, hy: -54, t: -18, fx: -136, fy: -7 }; const S = shoulderOf(p); return { frames: [{ ...p, ax: S.x + 44, ay: -48, ab: -1 }, { ...p, ax: S.x + 54, ay: -44, ab: -1 }], props: [{ k: 'ball', x: shoulderOf(p).x + 50, y: -24, r: 24 }], lab: ['Krąż', 'Krąż'] } },
  copenhagen: () => ({ view: 'f', frames: [{ hx: 0, hy: -48, t: 194, l1: 4, l2: 4, m1: 8, m2: 12, ax: -76, ay: -4, ab: -1, b1: -80, b2: -80 }, { hx: 0, hy: -50, t: 194, l1: 4, l2: 4, m1: 8, m2: 12, ax: -76, ay: -4, ab: -1, b1: -80, b2: -80 }], props: [{ k: 'bench', x: 140, y: -50, len: 70 }], ph: holdPh }),
  'bird-dog': () => {
    const b = { hx: 0, hy: -72, t: 0, l1: 90, l2: 180, fo: 180, bx: 84, by: -4, bb: -1, m1: 90, m2: 180 }
    return { frames: [{ ...b, ax: 84, ay: -4, ab: -1 }, { ...b, a1: -4, a2: -4, m1: 182, m2: 182 }], lab: ['Wyprostuj rękę i nogę', 'Wróć'] }
  },
  superman: () => { const b = { hx: 0, hy: -13, t: 0 }; return { frames: [{ ...b, a1: 0, a2: 0, l1: 180, l2: 180 }, { ...b, t: -8, a1: -18, a2: -18, l1: 196, l2: 196 }], lab: UP } },
  'bear-crawl': () => {
    const mk = (fx, gx, ax) => { const p = { hx: 0, hy: -82, t: -10, fx, fy: -7, gx, gy: -7 }; return { ...p, ax, ay: -4, ab: -1 } }
    return { frames: [mk(-36, -60, 82), mk(-60, -36, 62)], lab: ['Krok', 'Krok'] }
  },
  'dead-bug': () => { const b = { hx: 0, hy: -13, t: 180, l1: -90, l2: 0 }; return { frames: [{ ...b, a1: -90, a2: -90 }, { ...b, a1: 174, a2: 174, m1: -4, m2: -4 }], lab: ['Wyprostuj', 'Wróć'] } },
  hollow: sel => { const b = { cu: 0.5, hx: 0, hy: -16, t: 190, l1: -12, l2: -12, a1: 186, a2: 186 }; return sel.v === 'rock' ? { frames: [b, { ...b, t: 180, l1: -22, l2: -22, hy: -14 }], lab: ['Kołysz', 'Kołysz'] } : { frames: [b, { ...b, hy: -17 }], ph: holdPh } },
  'reverse-crunch': sel => {
    const b = { hx: 0, hy: -13, t: 180, a1: 0, a2: 0 }
    // the pelvis curls up off the floor; vertical: legs straight up and the hips pushed towards the ceiling
    const end = sel.v === 'vertical' ? { hy: -62, t: 152, l1: -88, l2: -88, cu: 0.6 } : { hy: -40, t: 166, l1: -150, l2: -70, cu: 0.6 }
    return { frames: [{ ...b, ...(sel.v === 'vertical' ? { l1: -88, l2: -88 } : { l1: -60, l2: 30 }) }, { ...b, ...end }], lab: ['Unieś biodra', 'Opuść'] }
  },
  'v-up': () => { const b = { hx: 0, hy: -13 }; return { frames: [{ ...b, t: 180, l1: 0, l2: 0, a1: 180, a2: 180 }, { ...b, t: 234, l1: -50, l2: -50, a1: -40, a2: -40, cu: 0.6 }], lab: ['Złóż się', 'Połóż się'] } },
  bicycle: () => { const b = { hx: 30, hy: -16, t: 204, cu: 0.8, hold: 'head', ab: 1 }; return { frames: [{ ...b, l1: -40, l2: 60, m1: -6, m2: -6 }, { ...b, l1: -6, l2: -6, m1: -40, m2: 60 }], lab: ['Łokieć do kolana', 'Zmień stronę'] } },
  'landmine-rot': () => {
    // facing the anchor, both hands on the bar end, arms long: a rainbow from one hip over the head to the other hip
    const b = st({ fx: 26, fy: -7 }), arc = d => { const r = d * Math.PI / 180; return { ...b, hp: { x: Math.sin(r) * 72, y: -176 - Math.cos(r) * 52 }, ab: 1, af: 0.55 + 0.42 * Math.abs(Math.sin(r)) } } // arms reach towards the viewer at the top: they look shorter
    return { view: 'f', frames: [-78, -40, 0, 40, 78].map(arc), gear: [{ k: 'pole', from: { x: 0, y: -4 }, over: 10, flex: true }], ph: [[1100, 'Przenieś w górę', 0, 0.5], [1100, 'Na drugą stronę', 0.5, 1], [1100, 'Przenieś w górę', 1, 0.5], [1100, 'Na drugą stronę', 0.5, 0]] }
  },

  // ---------- full body ----------
  'power-clean': sel => {
    const bot = { hx: -60, hy: -82, t: -24, fx: 8, a1: 90, a2: 90 }
    const ext = st({ fx: 14, fy: -16, fo: 30, sg: 8, hy: -152 })
    const catchP = st({ hy: -128, hx: -8, hold: 'rack', ab: 1 })
    const frames = sel.v === 'hang' ? [{ ...bot, hx: -36, hy: -128, t: -50 }, ext, catchP] : [bot, ext, catchP]
    return { frames, gear: held(sel.eq), ph: [[900, 'Ciągnij', 0, 0.5], [500, 'Zarzuć', 0.5, 1], [800, 'Trzymaj', 1, 1], [1200, 'Opuść', 1, 0]] }
  },
  snatch: sel => {
    const bot = { hx: -60, hy: -82, t: -24, fx: 8, a1: 90, a2: 90 }
    const ext = st({ fx: 14, fy: -16, fo: 30, sg: 8, hy: -152 })
    const ov = sel.v === 'full' ? { hx: -36, hy: -68, t: -72, hold: 'up', fx: 10 } : st({ hy: -126, hx: -8, hold: 'up' })
    // the bar stays close: hips extend, elbows pull high and out to the chest, then the arms turn over to lock out
    const pull = { ...st({ fx: 14, fy: -12, fo: 30, sg: 10, hy: -150 }) }, S = shoulderOf(pull)
    void S
    const high = { ...pull, a1: -8, a2: 104, af: 0.5, ff: 1 } // elbows high and out to the sides (seen from the side: short upper arm), bar at the chest
    const turn = { ...pull, sg: 4, hy: -140, a1: -20, a2: -96, af: 0.55, ff: 1 } // wrists turn over in front of the face
    const So = shoulderOf(ov), top = { ...ov, hold: undefined, ax: So.x - 4, ay: So.y - 86, ab: 1 }
    return { frames: [sel.v === 'hang' ? { ...bot, hx: -36, hy: -128, t: -50 } : bot, ext, high, turn, top], gear: held(sel.eq), ph: [[900, 'Ciągnij', 0, 0.5], [500, 'Nad głowę', 0.5, 1], [800, 'Trzymaj', 1, 1], [1200, 'Opuść', 1, 0]] }
  },
  'clean-jerk': sel => {
    const rack = st({ hold: 'rack', ab: 1 }), dip = { ...rack, hy: -128, hx: -6 }
    const split = { hx: 0, hy: -118, t: -90, fx: 66, fy: -7, gx: -76, gy: -10, fo2: 30, hold: 'up' }
    return { frames: [rack, dip, split], gear: held(sel.eq), ph: [[600, 'Ugnij kolana', 0, 0.5], [500, 'Podrzuć', 0.5, 1], [800, 'Trzymaj', 1, 1], [1100, 'Wróć', 1, 0]] }
  },
  thruster: sel => {
    const bot = { hx: -36, hy: -68, t: -70, fx: 10, hold: 'rack', ab: 1 }
    return { frames: [bot, st({ hold: 'rack', ab: 1, fx: 10 }), st({ hold: 'up', fx: 10 })], gear: held(sel.eq, { at: 'hold' }), ph: [[700, 'Wstań', 0, 0.5], [600, 'Wypchnij', 0.5, 1], [600, 'Trzymaj', 1, 1], [1200, 'Zejdź', 1, 0]] }
  },
  'wall-ball': () => {
    const bot = { hx: -36, hy: -68, t: -70, fx: 10, hold: 'rack', ab: 1 }
    return { frames: [bot, st({ hold: 'rack', ab: 1, fx: 10 }), st({ hold: 'up', fx: 10 })], props: [{ k: 'wall', x: 120, top: -320 }], gear: [{ k: 'ball', at: 'hold', off: 0, r: 15 }], ph: [[700, 'Wstań', 0, 0.5], [500, 'Rzuć', 0.5, 1], [600, 'Złap', 1, 1], [1200, 'Zejdź', 1, 0]] }
  },
  'ball-slam': () => ({ frames: [st({ hold: 'up' }), { hx: -30, hy: -116, t: -30, fx: 8, a1: 80, a2: 80 }], gear: [{ k: 'ball', off: 6, dir: 90 }], lab: ['Rzuć o ziemię', 'Podnieś'] }),
  tgu: sel => {
    // lying → elbow → hand → hips up → far knee under → upright kneel → stand; the weight stays straight above the shoulder
    const up = { a1: -90, a2: -90, ab: 1 }
    const lie = { hx: 0, hy: -13, t: 180, fx: 56, fy: -7, lb: -1, gx: 132, gy: -9, bx: -10, by: -4, ...up }
    const elbow = { hx: 4, hy: -14, t: 205, fx: 56, fy: -7, lb: -1, gx: 132, gy: -9, bx: -24, by: -4, bb: 1, ...up }
    const handF = { hx: 6, hy: -15, t: 225, fx: 56, fy: -7, lb: -1, gx: 128, gy: -9, bx: -86, by: -4, bb: 1, ...up }
    const bridge = { hx: 10, hy: -46, t: 210, fx: 56, fy: -7, lb: -1, gx: 112, gy: -9, bx: -82, by: -4, bb: 1, ...up }
    const sweep = { hx: 0, hy: -50, t: 212, fx: 56, fy: -7, lb: -1, m1: 100, m2: 180, bx: -82, by: -4, bb: 1, ...up }
    const kneel = { hx: 0, hy: -76, t: -90, l1: 0, l2: 90, m1: 90, m2: 180, b1: 90, b2: 90, ...up }
    const stand = st({ ...up, b1: 90, b2: 90 })
    return { frames: [lie, elbow, handF, bridge, sweep, kneel, stand], gear: [{ k: sel.eq === 'db' ? 'db' : 'kb', up: true }], ph: [...seq(['Usiądź', 'Usiądź', 'Unieś biodra', 'Uklęknij', 'Uklęknij', 'Wstań'], 800), [2400, 'Wróć', 1, 0]] }
  },
  'sled-push': sel => {
    const pull = sel.v === 'pull'
    // a walking cycle: the standing foot slides under the body while the other swings through lifted
    const gait = (base, front, back) => {
      const mid = (front + back) / 2
      const st1 = { ...base, fx: front, fy: -7, gx: back, gy: -7 }, sw1 = { ...base, fx: mid, fy: -7, gx: mid + 4, gy: -30 }
      const st2 = { ...base, fx: back, fy: -7, gx: front, gy: -7 }, sw2 = { ...base, fx: mid + 4, fy: -30, gx: mid, gy: -7 }
      return [st1, sw1, st2, sw2, st1]
    }
    if (pull) return { frames: gait({ hx: 0, hy: -132, t: -100, a1: 30, a2: 30 }, -36, 26), props: [{ k: 'box', x: 210, w: 60, h: 34 }], gear: [{ k: 'cable', from: { x: 180, y: -30 } }], ph: [[1600, 'Krok', 0, 1]] }
    return { frames: gait({ hx: 0, hy: -118, t: -38, ax: 146, ay: -150, ab: 1 }, 34, -72), props: [{ k: 'post', x: 150, y2: -158, w: 6 }, { k: 'box', x: 178, w: 70, h: 30 }], ph: [[1600, 'Pchnij', 0, 1]] }
  },
  burpee: () => {
    // hands planted in front, feet jump back to a plank (legs fly back, not a kneel), back in, jump with the arms up
    const plank = board(-122, -7, -23, { ax: shoulderX(-122, -23), ay: -4, ab: -1 }), hx = plank.ax
    const stand = st({}), squat = { hx: -20, hy: -60, t: -20, fx: 10, fy: -7, ax: hx, ay: -4, ab: -1 }
    const kick = { hx: -10, hy: -100, t: -38, fx: -118, fy: -30, ax: hx, ay: -4, ab: -1 }
    const jump = st({ hy: -184, fy: -46, fo: 30, a1: -90, a2: -90, ab: -1 })
    const rise = { hx: -10, hy: -96, t: -60, fx: 10, fy: -7, a1: -10, a2: -10, ab: -1 } // arms swing forward on the way up
    const land = { ...st({ a1: 20, a2: 20 }), hy: -134, fx: 6 } // arms come down in front
    return { frames: [stand, squat, kick, plank, kick, squat, rise, jump, land, stand], ph: [[600, 'Przysiad', 0, 1 / 9], [700, 'Wyskok nogami w tył', 1 / 9, 3 / 9], [700, 'Nogi do rąk', 3 / 9, 5 / 9], [600, 'Wyskocz', 5 / 9, 7 / 9], [600, 'Wyląduj', 7 / 9, 1]] }
  },
  'battle-ropes': () => {
    // athletic half squat facing the anchor, arms whip up and down in turn; each rope makes its own wave
    const b = { hx: -10, hy: -100, t: -48, fx: 20, fy: -7, gx: -12, gy: -7 }, S = shoulderOf(b), x = S.x + 56
    const A = { ...b, ax: x + 6, ay: S.y + 26, bx: x, by: S.y + 78, ab: 1, bb: 1 }, B = { ...b, ax: x, ay: S.y + 78, bx: x + 6, by: S.y + 26, ab: 1, bb: 1 }
    return { frames: [{ ...A, wv: 0 }, { ...B, wv: Math.PI }, { ...A, wv: 2 * Math.PI }], props: [{ k: 'post', x: 300, y2: -26, w: 9 }], gear: [{ k: 'rope', from: { x: 296, y: -16 }, both: true }], ph: [[760, 'Faluj', 0, 1]] }
  },
  'kb-snatch': sel => ({ frames: [{ hx: -40, hy: -118, t: -30, fx: 6, a1: 110, a2: 120 }, st({ a1: 10, a2: -10 }), st({ a1: -88, a2: -88 })], gear: [{ k: sel.eq === 'db' ? 'db' : 'kb', up: true }], lab: ['Zamach nad głowę', 'Opuść'] }),
  jumps: sel => {
    const v = sel.v || 'box'
    const stand = st({ a1: 90, a2: 90 }), dip = { ...stand, hx: -30, hy: -92, t: -56, a1: 150, a2: 150 }
    if (v === 'box') return { frames: [stand, dip, { hx: 90, hy: -60 - 150, t: -80, l1: 30, l2: 120, a1: -60, a2: -60 }, { hx: 100, hy: -60 - 110, t: -60, fx: 110, fy: -67, a1: 40, a2: 40 }], props: [{ k: 'box', x: 120, w: 80, h: 60 }], ph: [...seq(['Ugnij się', 'Wyskocz', 'Wyląduj na skrzyni'], 600), [1200, 'Zejdź', 1, 0]] }
    if (v === 'broad') return { frames: [stand, dip, { hx: 70, hy: -170, t: -70, l1: 150, l2: 120, a1: -40, a2: -40 }, { ...dip, hx: 120, fx: 150 }], ph: [...seq(['Ugnij się', 'Skocz w dal', 'Wyląduj'], 600), [1000, 'Wróć', 1, 0]] }
    if (v === 'lunge') return { frames: [{ hx: 0, hy: -84, t: -90, fx: 60, fy: -7, gx: -74, gy: -8, a1: 90, a2: 90 }, { hx: 0, hy: -170, t: -90, l1: 80, l2: 100, m1: 100, m2: 120, a1: 0, a2: 0 }, { hx: 0, hy: -84, t: -90, fx: -74, fy: -8, gx: 60, gy: -7, a1: 90, a2: 90 }], ph: [[700, 'Wyskocz', 0, 0.5], [700, 'Zmień nogi', 0.5, 1], [700, 'Wyskocz', 1, 0.5], [700, 'Zmień nogi', 0.5, 0]] }
    return { frames: [dip, st({ hy: -184, fy: -46, fo: 30, a1: -90, a2: -90 })], lab: ['Wyskocz', 'Wyląduj'] }
  },
}

// catalogue base + chosen options → scene data for the rig (null = no animation)
export function rigScene(baseId, sel = {}) {
  const f = LIB[baseId]
  if (!f) return null
  try { return f(sel) } catch { return null }
}
export const LIB_IDS = Object.keys(LIB)
