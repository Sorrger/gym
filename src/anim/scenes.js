// Exercise animations. Each scene uses the shared figure (model.js): static shapes + a frame(k) for the moving parts,
// k = 0 (start) … 1 (end of the movement). Roles (c) become CSS classes in ExerciseAnim.vue, so colours follow the theme.
import { rigScene } from './library'
import { frameBox, joints, poseAt } from './rig'

const BENCH_CUES = {
  pl: ['Ściągnij łopatki, stopy mocno na ziemi.', 'Opuść sztangę powoli do dołu klatki.', 'Wypchnij w górę, łokcie ok. 45° od tułowia.'],
  en: ['Pinch your shoulder blades, feet firmly down.', 'Lower the bar slowly to the lower chest.', 'Press up, elbows about 45° from the body.'],
}

// catalogue base id + options → scene (shared rig)
export function sceneFor(baseId, sel = {}, mus = {}) {
  const d = rigScene(baseId, sel)
  if (!d) return null
  const lab = d.lab || ['', '']
  const phases = d.ph || [[1300, lab[0], 0, 1], [300, lab[0], 1, 1], [1000, lab[1], 1, 0], [400, lab[1], 0, 0]]
  const scene = { rig: true, ...d, phases, main: mus.main || [], help: mus.help || [] }
  const att = attachFor(baseId, sel)
  if (att) scene.inset = { kind: att, label: ATT[att] }
  if (baseId === 'bench-press' && (sel.eq === 'bb' || sel.eq === 'sm') && sel.angle === 'flat' && sel.width !== 'close') scene.cues = BENCH_CUES
  scene.box = frameBox(scene)
  const J0 = joints(scene.frames[0], scene.view)
  // cable version of a free-weight scene: the weight becomes a handle on a cable from a low pulley in front (lying: beyond the head)
  if (sel.eq === 'cb' && !(scene.gear || []).some(g => ['cable', 'band', 'rope', 'lever', 'bar2', 'deck'].includes(g.k))) {
    const lying = Math.abs(Math.cos(scene.frames[0].t * Math.PI / 180)) > 0.8
    const from = lying ? { x: J0.S.x + (J0.S.x < J0.H.x ? -90 : 90), y: -14 } : { x: J0.W.x + (scene.view === 'f' ? 0 : 70), y: -14 }
    scene.gear = [{ k: 'cable', from, both: scene.view === 'f' }, { k: 'handle' }]
    if (scene.view !== 'f') scene.props = [...(scene.props || []), { k: 'tower', x: from.x + 6, top: -60, pulley: from.y }]
    scene.box = frameBox(scene)
  }
  const own = sel.eq === 'mc' ? MACHINE[baseId]?.(J0, sel) : null
  if (own) scene.gear = own
  // machines get a weight stack behind the figure (left in side view, right in front view)
  const stacked = (sel.eq === 'mc' && !NO_STACK.has(baseId) && !(baseId === 'calf-raise' && sel.pos === 'legpress')) || sel.eq === 'as'
  if (stacked) {
    const b = scene.box, front = scene.view === 'f'
    const x = front ? b.x + b.w + 4 : b.x + 6
    scene.props = [{ k: 'stack', x }, ...(scene.props || [])]
    if (sel.eq === 'as') { // assisted machine: a platform under the knees / feet on a lever that the stack pushes up
      const ys = scene.frames.map(f => { const J = joints(f, scene.view); return Math.max(J.K.y, J.K2.y) })
      scene.gear = [...(scene.gear || []).filter(g => g.k !== 'footpad'), { k: 'lift', pivot: { x: x + (front ? -26 : 26), y: Math.max(...ys) + 30 } }]
    }
    // the handles hang on a cable from the stack, unless a machine arm or a cable is drawn already
    if (!(scene.gear || []).some(g => ['lever', 'cable', 'pole', 'plat', 'backpad', 'deck', 'armpads', 'bar2', 'kneepads', 'pad', 'shin', 'lift'].includes(g.k))) {
      // pulley at the average height of the hands (like an adjustable cable column)
      const ys = scene.frames.map(f => joints(f, scene.view).W.y), y = Math.max(-220, Math.min(-30, ys.reduce((a, b) => a + b, 0) / ys.length))
      scene.gear = [{ k: 'cable', from: { x, y }, both: front }, ...(scene.gear || [])]
    }
    // every machine arm hangs on a frame joined to the stack, so handles, arm and weights read as one machine
    const fixed = name => { const ps = scene.frames.map(f => joints(f, scene.view)[name]); return ps.every(p => Math.hypot(p.x - ps[0].x, p.y - ps[0].y) < 6) ? ps[0] : null }
    const top0 = -230
    for (const g of scene.gear || []) {
      const P = g.k === 'lever' || g.k === 'lift' ? (typeof g.pivot === 'object' ? g.pivot : g.pivot === 'knee' ? fixed('K') : g.pivot === 'elbow' ? fixed('E') : null)
        : g.k === 'deck' ? { x: 0, y: g.y } : g.k === 'bar2' ? { x: 0, y: g.top ?? -330 } : g.k === 'armpads' ? { x: J0.SR.x, y: J0.SR.y } : g.k === 'kneepads' ? { x: J0.H.x, y: J0.H.y + 24 } : null
      if (!P) continue
      const fr = (x1, y1, x2, y2) => scene.props.push({ k: 'line', x1, y1, x2, y2, w: 6, c: 'gear frame' })
      if (P.y > -130) fr(x, P.y, P.x, P.y) // low pivot: straight across from the stack
      else { const top = Math.min(top0, P.y - 18); fr(x, top0, x, top); fr(x, top, P.x, top); fr(P.x, top, P.x, P.y) }
    }
    // how far the weights ride up in each frame: the joint that travels most, scaled down
    const js = scene.frames.map(f => joints(f, scene.view)), keys = ['W', 'A', 'K', 'H', 'S']
    const far = Object.fromEntries(keys.map(n => [n, Math.max(...js.map(j => Math.hypot(j[n].x - js[0][n].x, j[n].y - js[0][n].y)))]))
    const key = keys.reduce((a, n) => (far[n] > far[a] ? n : a), 'W'), rest = 0 // frame 0 = weights resting
    const top = Math.max(16, Math.min(32, far[key] * 0.4)) || 0
    scene.frames = scene.frames.map((f, i) => ({ ...f, lift: far[key] ? top * Math.hypot(js[i][key].x - js[rest][key].x, js[i][key].y - js[rest][key].y) / far[key] : 0 }))
    // belt squat: the belt cable runs under the platform to the stack
    if (baseId === 'belt-squat') scene.props.push({ k: 'line', x1: x, y1: -4, x2: J0.H.x, y2: -4, w: 1.6, c: 'cable' })
    scene.box = frameBox(scene)
  }
  // a machine arm or a landmine bar is rigid: the hands move on a circle round its pivot, at one length
  for (const g of scene.gear || []) {
    const P = g.k === 'lever' && typeof g.pivot === 'object' && (!g.to || g.to === 'hands') ? g.pivot : g.k === 'pole' ? g.from : null
    if (!P) continue
    // in-between frames on the arc, so the blend doesn't cut across the circle
    const fr = scene.frames, dense = [fr[0]]
    for (let i = 1; i < fr.length; i++) { for (const u of [0.25, 0.5, 0.75]) dense.push(poseAt([fr[i - 1], fr[i]], u)); dense.push(fr[i]) }
    scene.frames = dense
    const ws = scene.frames.map(f => { const J = joints(f, scene.view); return J.P || J.W })
    const R = ws.reduce((a, w) => a + Math.hypot(w.x - P.x, w.y - P.y), 0) / ws.length
    scene.frames = scene.frames.map((f, i) => {
      const w = ws[i], d = Math.hypot(w.x - P.x, w.y - P.y) || 1, q = { x: P.x + (w.x - P.x) * R / d, y: P.y + (w.y - P.y) * R / d }
      if (f.hold) { const { hold, ...rest } = f; void hold; return { ...rest, hp: q } }
      return { ...f, ax: q.x, ay: q.y }
    })
    break
  }
  // Smith machine: the bar runs in vertical rails
  if (sel.eq === 'sm') {
    const xs = scene.frames.map(f => { const J = joints(f, scene.view); return (J.P || J.W).x })
    const x = xs.reduce((a, b) => a + b, 0) / xs.length
    scene.frames = scene.frames.map(f => (f.hold || f.ax == null ? f : { ...f, ax: x, ...(f.bx != null ? { bx: x } : {}) }))
    scene.props = [{ k: 'line', x1: x, y1: 0, x2: x, y2: -340, w: 6, c: 'gear frame' }, { k: 'line', x1: x - 16, y1: -340, x2: x + 16, y2: -340, w: 7, c: 'gear frame' }, ...(scene.props || [])]
    scene.box = frameBox(scene)
  }
  return scene
}
// what the hands hold: free-weight kind, or the attachment on the cable
const ATT = { bb: 'Sztanga', ez: 'Gryf łamany', db: 'Hantle', kb: 'Kettlebell', hx: 'Gryf heksagonalny', tb: 'T-gryf', bd: 'Guma',
  rope: 'Lina', vbar: 'V-uchwyt', bar: 'Drążek', lat: 'Szeroki drążek', d: 'Uchwyt D', ankle: 'Opaska na kostkę' }
const ANKLE = new Set(['leg-curl', 'glute-kickback', 'hip-abduction', 'hip-adduction', 'reverse-crunch'])
const ROPE = new Set(['face-pull', 'pull-through', 'crunch', 'rear-delt-row', 'oblique-crunch'])
const BAR = new Set(['pullover', 'shrug', 'upright-row', 'curl', 'skull-crusher', 'wrist-curl', 'straight-arm', 'front-raise', 'pushdown', 'overhead-ext'])
export function attachFor(id, sel) {
  const eq = sel.eq
  if (id === 'battle-ropes') return null
  if (eq !== 'cb') return ['bb', 'ez', 'db', 'kb', 'hx', 'tb', 'bd'].includes(eq) ? eq : null
  if (ANKLE.has(id)) return 'ankle'
  if (sel.v === 'rope' || ROPE.has(id)) return 'rope'
  if (sel.v === 'vbar') return 'vbar'
  if (sel.side === 'one' || sel.v === 'katana' || (id === 'curl' && (sel.pos === 'behind' || sel.pos === 'overhead'))) return 'd'
  if (id === 'lat-pulldown') return sel.width === 'close' || sel.grip === 'neutral' ? 'vbar' : 'lat'
  if (id === 'cable-row') return sel.width === 'wide' ? 'lat' : sel.grip === 'neutral' || !sel.grip || sel.width === 'close' ? 'vbar' : 'bar'
  if (sel.v === 'bar' || BAR.has(id)) return 'bar'
  return 'd'
}

// machine parts for exercises whose free-weight scene doesn't show the machine (J0 = joints of the first frame)
const MACHINE = {
  'torso-rotation': J0 => [{ k: 'lever', pivot: { x: J0.S.x + 10, y: J0.S.y - 70 } }, { k: 'handle' }],
  'hip-abduction': (J0, sel) => (sel.pos === 'stand' ? null : [{ k: 'kneepads', side: 1 }]),
  'hip-adduction': () => [{ k: 'kneepads', side: -1 }],
  'glute-kickback': J0 => [{ k: 'lever', pivot: { x: J0.H.x - 10, y: J0.H.y + 34 }, to: 'roller', side: 1 }, { k: 'shin', side: 1 }],
  'calf-raise': (J0, sel) => (sel.pos === 'stand' || !sel.pos ? [{ k: 'lever', pivot: { x: J0.S.x - 90, y: J0.S.y + 70 }, to: 'shoulder' }, { k: 'pad', at: 'shoulder' }] : null),
  'back-extension': () => [{ k: 'lever', pivot: 'hip', to: 'shoulder' }, { k: 'pad', at: 'shoulder' }],
  'hip-thrust': J0 => [{ k: 'lever', pivot: { x: J0.H.x - 80, y: J0.H.y + 16 }, to: 'hip' }, { k: 'pad', at: 'hip', r: 12 }],
  'tibialis-raise': () => [{ k: 'shin', side: -1 }],
  'belt-squat': J0 => [{ k: 'cable', from: { x: J0.H.x, y: -4 }, at: 'hip' }],
  'reverse-hyper': () => [{ k: 'lever', pivot: { x: 40, y: -112 }, to: 'foot' }, { k: 'shin' }],
  'sissy-squat': () => [{ k: 'shin', side: -1 }],
}
const NO_STACK = new Set(['leg-press', 'hack-squat', 'pendulum', 'sled-push', 'tibialis-raise', 'sissy-squat'])

// "Nauka podciągania": one scene + cues per part of the stage (dead hang, negatives, assisted, full)
const PULL_CUES = {
  Wiszenie: { pl: ['Chwyć drążek nachwytem, trochę szerzej niż barki.', 'Zwiśnij na prostych rękach, barki lekko ściągnięte w dół.', 'Trzymaj spokojnie, bez bujania.'],
    en: ['Grip the bar overhand, a bit wider than your shoulders.', 'Hang on straight arms, shoulders pulled slightly down.', 'Hold still, no swinging.'] },
  Negatywy: { pl: ['Wskocz albo wejdź na podest, tak żeby broda była nad drążkiem.', 'Opuszczaj się powoli, 3–5 sekund, aż ręce będą proste.', 'Stań na ziemi i powtórz.'],
    en: ['Jump or step up so your chin is above the bar.', 'Lower yourself slowly, 3–5 seconds, until your arms are straight.', 'Stand down and repeat.'] },
  'Ze wspomaganiem': { pl: ['Uklęknij na podporze maszyny i chwyć uchwyty.', 'Podciągnij się, aż broda minie uchwyty.', 'Opuść się powoli. Mniej kg pomocy = trudniej.'],
    en: ['Kneel on the machine pad and grip the handles.', 'Pull up until your chin passes the handles.', 'Lower slowly. Less help (kg) = harder.'] },
  'Pełne': { pl: ['Zwiśnij na prostych rękach.', 'Podciągnij się, aż broda będzie nad drążkiem, bez bujania.', 'Opuść się powoli do prostych rąk.'],
    en: ['Hang on straight arms.', 'Pull up until your chin is over the bar, no swinging.', 'Lower slowly to straight arms.'] },
}
export function pullupPart(label) {
  const mus = { main: ['lats'], help: ['biceps', 'upperback', 'forearms'] }
  let sc
  if (label === 'Wiszenie') sc = sceneFor('dead-hang', {}, { main: ['forearms'], help: ['lats'] })
  else if (label === 'Ze wspomaganiem') sc = sceneFor('pull-up', { eq: 'as', grip: 'over', width: 'normal' }, mus)
  else sc = sceneFor('pull-up', { eq: 'bw', grip: 'over', width: 'normal' }, mus)
  if (sc && label === 'Negatywy') sc.phases = [[500, 'Podskocz', 0, 1], [500, 'Trzymaj', 1, 1], [4000, 'Opuszczaj powoli', 1, 0], [800, 'Opuszczaj powoli', 0, 0]]
  return sc ? { ...sc, cues: PULL_CUES[label] } : null
}
