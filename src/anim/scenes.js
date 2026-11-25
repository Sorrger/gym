// Exercise animations. Each scene uses the shared figure (model.js): static shapes + a frame(k) for the moving parts,
// k = 0 (start) … 1 (end of the movement). Roles (c) become CSS classes in ExerciseAnim.vue, so colours follow the theme.
import { rigScene } from './library'
import { frameBox } from './rig'

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
    scene.props = [{ k: 'stack', x: scene.view === 'f' ? b.x + b.w + 4 : b.x + 6 }, ...(scene.props || [])]
    scene.box = frameBox(scene)
  }
  return scene
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
