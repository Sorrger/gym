// One figure for every exercise animation. Change a proportion here and every animation follows.
// Units = SVG px in a 380 × 250 scene. Real-body ratios: thigh ≈ shin ≈ 0.85 torso, arm a bit longer than the torso.
export const FIG = {
  head: 13.5, neck: 11, torso: 82, torsoW: 24,
  upperArm: 46, foreArm: 42, armW: 12, foreW: 10, hand: 6.5,
  thigh: 70, shin: 68, legW: 16, foot: 24,
}

export const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
export const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

// two-bone reach (shoulder → elbow → hand, hip → knee → ankle): the middle joint goes to the side that `pick` prefers
export function reach(root, target, l1, l2, pick = (a, b) => (a.x > b.x ? a : b)) {
  const dx = target.x - root.x, dy = target.y - root.y
  const d = Math.max(Math.abs(l1 - l2) + 1, Math.min(Math.hypot(dx, dy), l1 + l2 - 0.5))
  const a = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)), th = Math.atan2(dy, dx)
  const [p, q] = [th + a, th - a].map(r => ({ x: root.x + l1 * Math.cos(r), y: root.y + l1 * Math.sin(r) }))
  const mid = pick(p, q)
  const k = d / Math.hypot(dx, dy || 1e-9)
  const end = Math.hypot(dx, dy) > d ? { x: root.x + dx * k, y: root.y + dy * k } : target
  return { mid, end }
}

// phases: [ms, label, from, to] with from/to in 0..1 along the movement; returns { k, label } for time t
export function phaseAt(phases, t) {
  const total = phases.reduce((s, p) => s + p[0], 0)
  let r = t % total
  for (const [ms, label, a, b] of phases) {
    if (r < ms) return { k: a + (b - a) * ease(r / ms), label }
    r -= ms
  }
  return { k: 0, label: '' }
}
