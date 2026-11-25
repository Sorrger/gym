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
  return scene
}
