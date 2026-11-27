// Anatomy check for every catalogue animation (side view): elbows and knees must never bend the wrong way
// (hyperextension) or fold past what a body can do; hips and shoulders must stay in a human range.
// Run: npx esbuild tests/anim/joints.mjs --bundle --platform=node --format=esm --outfile=/tmp/joints.mjs && node /tmp/joints.mjs
// Rules (figure faces right; lying poses are rotations, so they hold too):
//   elbow: forearm turns toward the front of the upper arm → rel = ang(E→W) − ang(S→E) ≤ 0 (+ = hyperextension)
//   knee:  shin turns toward the back of the thigh        → rel = ang(K→A) − ang(H→K) ≥ 0 (− = hyperextension)
//   hip:   thigh forward of the torso line = flexion; more than 30° behind = hyperextension
//   shoulder: arm more than 70° behind the torso line, or past 200° overhead
import { BASES, fullSel, compose } from '../../src/catalog.js'
import { sceneFor } from '../../src/anim/scenes.js'
import { poseAt, joints } from '../../src/anim/rig.js'
const N = 80, TOL = 8, out = []
const ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI
const norm = a => ((a + 540) % 360) - 180
for (const b of BASES) {
  const seen = new Set()
  for (const eq of b.o.eq || ['']) for (const ax of ['', 'pos', 'v', 'angle', 'side', 'grip', 'width', 'stance']) for (const val of ax ? (ax === 'v' ? (b.v || []).map(x => x[0]) : b.o[ax] || []) : ['']) {
    const sel = fullSel(b, { ...fullSel(b, eq ? { eq } : {}), ...(ax ? { [ax]: val } : {}) }), key = JSON.stringify(sel)
    if (seen.has(key)) continue; seen.add(key)
    const sc = sceneFor(b.id, sel, compose(b, sel)); if (!sc || sc.view === 'f' || sc.top) continue
    const worst = {}
    const note = (what, v, i) => { if (!worst[what] || Math.abs(v) > Math.abs(worst[what][0])) worst[what] = [Math.round(v), i] }
    for (let i = 0; i <= N; i++) {
      const p = poseAt(sc.frames, i / N), J = joints(p, sc.view), t = p.t
      const limbs = [['łokieć', J.S, J.E, J.W, -1], ['łokieć2', J.SL || J.S, J.E2, J.W2, -1], ['kolano', J.HR || J.H, J.K, J.A, 1], ['kolano2', J.HL || J.H, J.K2, J.A2, 1]]
      for (const [n, r, m, e, sgn] of limbs) {
        if (!m || !e) continue
        if (Math.hypot(e.x - m.x, e.y - m.y) < 5) continue // foreshortened to a point – not readable
        const rel = norm(ang(m, e) - ang(r, m)) // − = elbow flexion, + = knee flexion
        const flex = sgn === -1 ? -rel : rel // flexion as a positive number for both
        if (flex < -TOL) note(n + ' przeprost', flex, i)
        if (flex > 160) note(n + ' za mocno zgięte', flex, i)
      }
      for (const [n, H0, K0] of [['biodro', J.H, J.K], ['biodro2', J.H, J.K2]]) {
        if (!K0) continue
        const flex = norm((t + 180) - ang(H0, K0))
        if (flex < -30) note(n + ' przeprost', flex, i)
        if (flex > 155) note(n + ' za mocno zgięte', flex, i) // the torso line includes the spine: a deep squat / deficit pull reaches ~150
      }
      // ankle: the foot is drawn at `fo` (absolute) or square to the shin; 0 = neutral, + = toes down (up to ~90 when kneeling on the instep), − = toes up (dorsiflexion, real limit ~45)
      for (const [n, K0, A0, fo] of [['stopa', J.K, J.A, p.fo], ['stopa2', J.K2, J.A2, p.fo2 ?? p.fo]]) {
        if (!K0 || fo == null) continue
        const pf = norm(fo - (ang(K0, A0) - 90))
        if (pf < -45) note(n + ' za mocno w górę', pf, i)
        if (pf > 95) note(n + ' za mocno w dół', pf, i)
      }
      // head: tilt against the torso
      if (Math.abs(p.hd || 0) > 55) note('głowa', p.hd, i)
      for (const [n, S0, E0] of [['bark', J.S, J.E], ['bark2', J.S, J.E2]]) {
        if (!E0) continue
        let flex = norm((t + 180) - ang(S0, E0)); if (flex < -110) flex += 360
        if (flex < -70) note(n + ' za daleko w tył', flex, i)
        if (flex > 200) note(n + ' za daleko nad głowę', flex, i)
      }
    }
    const keys = Object.keys(worst)
    if (keys.length) out.push(`${compose(b, sel).name}  [${b.id} ${key}]  ` + keys.map(k => `${k} ${worst[k][0]}° @${worst[k][1]}`).join(' | '))
  }
}
console.log(out.join('\n')); console.log(out.length + ' flagged')
