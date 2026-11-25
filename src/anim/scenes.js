// Exercise animations. Each scene uses the shared figure (model.js): static shapes + a frame(k) for the moving parts,
// k = 0 (start) … 1 (end of the movement). Roles (c) become CSS classes in ExerciseAnim.vue, so colours follow the theme.
import { FIG, reach, lerp } from './model'

const line = (a, b, w, c) => ({ t: 'line', a: { x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'stroke-width': w }, c })
const FLOOR = 226

// lying on a flat bench, pressing a barbell from the lower chest to straight arms
function benchPress() {
  const S = { x: 132, y: 134 }, H = { x: S.x + FIG.torso - 2, y: 142 }
  const top = { x: S.x + 8, y: S.y - (FIG.upperArm + FIG.foreArm) + 2 }, bot = { x: S.x + 24, y: S.y - 16 }
  const ankle = { x: H.x + 76, y: FLOOR - 12 }
  const leg = reach(H, ankle, FIG.thigh, FIG.shin, (a, b) => (a.y < b.y ? a : b))
  const benchTop = S.y + 16
  const head = { x: S.x - 30, y: S.y + 2 }
  return {
    phases: [[1500, 'Opuść', 0, 1], [350, 'Dotknij klatki', 1, 1], [1000, 'Wypchnij', 1, 0], [600, 'Góra', 0, 0]],
    path: [top, bot],
    back: [
      { t: 'ellipse', a: { cx: 200, cy: FLOOR + 2, rx: 130, ry: 5 }, c: 'shadow' },
      line({ x: 30, y: FLOOR }, { x: 350, y: FLOOR }, 2, 'ground'),
      { t: 'rect', a: { x: 104, y: benchTop + 12, width: 8, height: FLOOR - benchTop - 12, rx: 2 }, c: 'gear' },
      { t: 'rect', a: { x: 208, y: benchTop + 12, width: 8, height: FLOOR - benchTop - 12, rx: 2 }, c: 'gear' },
      { t: 'rect', a: { x: 92, y: benchTop, width: 138, height: 13, rx: 5 }, c: 'gear' },
      { t: 'path', a: { d: `M${H.x} ${H.y} L${leg.mid.x} ${leg.mid.y} L${leg.end.x} ${leg.end.y}`, 'stroke-width': FIG.legW }, c: 'limb' },
      { t: 'path', a: { d: `M${ankle.x - 8} ${FLOOR - 14} Q${ankle.x - 8} ${FLOOR - 20} ${ankle.x} ${FLOOR - 20} L${ankle.x + FIG.foot - 8} ${FLOOR - 12} Q${ankle.x + FIG.foot - 2} ${FLOOR - 9} ${ankle.x + FIG.foot - 3} ${FLOOR - 4} L${ankle.x + FIG.foot - 3} ${FLOOR - 2} L${ankle.x - 8} ${FLOOR - 2} Z` }, c: 'body' },
      { t: 'path', a: { d: `M${S.x - 8} ${S.y + 6} C${S.x - 8} ${S.y - 9} ${S.x + 10} ${S.y - 12} ${S.x + 30} ${S.y - 9} C${S.x + 54} ${S.y - 6} ${S.x + 74} ${S.y - 4} ${H.x + 4} ${S.y - 1} C${H.x + 14} ${S.y + 2} ${H.x + 14} ${S.y + 16} ${H.x + 2} ${S.y + 17} L${S.x - 2} ${S.y + 17} C${S.x - 8} ${S.y + 17} ${S.x - 8} ${S.y + 12} ${S.x - 8} ${S.y + 6} Z` }, c: 'body' },
      { t: 'path', a: { d: `M${S.x + 8} ${S.y - 7} C${S.x + 18} ${S.y - 13} ${S.x + 34} ${S.y - 13} ${S.x + 46} ${S.y - 8}`, 'stroke-width': 7 }, c: 'accent' },
      line({ x: head.x + 10, y: S.y + 4 }, { x: S.x - 6, y: S.y + 4 }, 9, 'limb'),
      { t: 'circle', a: { cx: head.x, cy: head.y, r: FIG.head }, c: 'body' },
      { t: 'path', a: { d: `M${head.x - 8} ${head.y - 8} Q${head.x} ${head.y - 16} ${head.x + 10} ${head.y - 8}`, 'stroke-width': 4 }, c: 'hair' },
    ],
    // the near arm is drawn on top (with an outline) so it stays visible when the elbow goes below the bench
    frame(k) {
      const hand = lerp(top, bot, k)
      const { mid: E, end } = reach(S, hand, FIG.upperArm, FIG.foreArm, (p, q) => (p.y > q.y ? p : q)) // elbow drops below the body
      return [
        { t: 'plate', at: end, r: 24, under: true }, // the far side of the bar: behind the body, so it touches the chest
        line(S, E, FIG.armW + 5, 'outline'), line(E, end, FIG.foreW + 5, 'outline'),
        line(S, E, FIG.armW, 'near'), line(E, end, FIG.foreW, 'near'),
        { t: 'circle', a: { cx: end.x, cy: end.y, r: FIG.hand }, c: 'hand' },
      ]
    },
    cues: {
      pl: ['Ściągnij łopatki, stopy mocno na ziemi.', 'Opuść sztangę powoli do dołu klatki.', 'Wypchnij w górę, łokcie ok. 45° od tułowia.'],
      en: ['Pinch your shoulder blades, feet firmly down.', 'Lower the bar slowly to the lower chest.', 'Press up, elbows about 45° from the body.'],
    },
  }
}

// catalogue base id → scene for the chosen options (null = no animation for this variant yet)
const SCENES = {
  'bench-press': sel => ((sel.eq === 'bb' || sel.eq === 'sm') && sel.angle === 'flat' ? benchPress() : null),
}
export function sceneFor(baseId, sel = {}) { return SCENES[baseId]?.(sel) || null }
