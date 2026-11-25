// Exercise animations. Each scene uses the shared figure (model.js): static shapes + a frame(k) for the moving parts,
// k = 0 (start) … 1 (end of the movement). Roles (c) become CSS classes in ExerciseAnim.vue, so colours follow the theme.
import { rigScene } from './library'
import { frameBox, joints } from './rig'

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
  if (baseId === 'bench-press' && (sel.eq === 'bb' || sel.eq === 'sm') && sel.angle === 'flat' && sel.width !== 'close') scene.cues = BENCH_CUES
  scene.box = frameBox(scene)
  // machines get a weight stack behind the figure (left in side view, right in front view)
  if (sel.eq === 'mc' && !NO_STACK.has(baseId) && !(baseId === 'calf-raise' && sel.pos === 'legpress')) {
    const b = scene.box
    const x = scene.view === 'f' ? b.x + b.w + 4 : b.x + 6
    scene.props = [{ k: 'stack', x }, ...(scene.props || [])]
    const own = MACHINE[baseId]?.(joints(scene.frames[0], scene.view), sel)
    if (own) scene.gear = own
    // the handles hang on a cable from the stack, unless a machine arm or a cable is drawn already
    if (!(scene.gear || []).some(g => ['lever', 'cable', 'pole', 'plat', 'backpad', 'deck', 'armpads', 'bar2', 'kneepads', 'pad', 'shin'].includes(g.k))) {
      // pulley at the average height of the hands (like an adjustable cable column)
      const ys = scene.frames.map(f => joints(f, scene.view).W.y), y = Math.max(-220, Math.min(-30, ys.reduce((a, b) => a + b, 0) / ys.length))
      scene.gear = [{ k: 'cable', from: { x, y }, both: scene.view === 'f' }, ...(scene.gear || [])]
    }
    scene.box = frameBox(scene)
  }
  // Smith machine: the bar runs in vertical rails
  if (sel.eq === 'sm') {
    const xs = scene.frames.map(f => { const J = joints(f, scene.view); return (J.P || J.W).x })
    const x = xs.reduce((a, b) => a + b, 0) / xs.length
    scene.props = [{ k: 'line', x1: x - 6, y1: 0, x2: x - 6, y2: -340, w: 6, c: 'gear frame' }, { k: 'line', x1: x - 20, y1: -340, x2: x + 8, y2: -340, w: 7, c: 'gear frame' }, ...(scene.props || [])]
    scene.box = frameBox(scene)
  }
  return scene
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
const NO_STACK = new Set(['leg-press', 'hack-squat', 'pendulum', 'sled-push'])

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
