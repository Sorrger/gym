// Generic rig: a pose → shapes for the shared figure (FIG in model.js). Side view facing right, or front view (scene.view 'f').
// Floor = y 0, up = negative y. Angles in degrees, SVG style (0 = right, 90 = down).
// Pose fields (numbers, so poses blend):
//   hx, hy hip · t torso direction (hip → shoulder) · hd head tilt · sg shoulder shrug (px)
//   near arm: a1, a2 absolute | ra1, ra2 relative to t | ax, ay hand target (+ ab bend side ±1) | hold: 'back'|'rack'|'chest'|'up'|'head'|'hip' (+ hox, hoy)
//   far arm:  b1, b2 | rb1, rb2 | bx, by (+ bb) – missing = same as near (side view) / mirrored (front view)
//   near leg: l1, l2 | fx, fy (+ lb) · far leg: m1, m2 | gx, gy (+ gb) · fo foot direction · rl/wv/rot extras for gear
import { FIG } from './model'

const R = Math.PI / 180
export const at = (p, deg, len) => ({ x: p.x + Math.cos(deg * R) * len, y: p.y + Math.sin(deg * R) * len })
export const ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x) / R
const add = (p, v, k = 1) => ({ x: p.x + v.x * k, y: p.y + v.y * k })

// an elbow / knee folds at most to ~158° (forearm and upper arm, shin and thigh can't pass through each other)
const FOLD = 158
function chain(root, l1, l2, a1, a2, tx, ty, bend) {
  if (tx != null && ty != null) {
    const dx = tx - root.x, dy = ty - root.y, full = Math.hypot(dx, dy) || 1e-6
    const dMin = Math.sqrt(l1 * l1 + l2 * l2 - 2 * l1 * l2 * Math.cos((180 - FOLD) * R))
    const d = Math.max(dMin, Math.min(full, l1 + l2 - 0.3))
    const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))) / R
    const mid = at(root, Math.atan2(dy, dx) / R + a * Math.max(-1, Math.min(1, bend)), l1) // fractional bend = elbow passing through the line
    const T = { x: root.x + dx * d / full, y: root.y + dy * d / full }
    // while the elbow/knee passes through the line the hand/foot stays on its target (the lower part looks a bit shorter, like turning)
    return { mid, end: Math.abs(bend) < 1 ? T : at(mid, ang(mid, T), l2) }
  }
  const mid = at(root, a1, l1)
  const rel = ((a2 - a1 + 540) % 360) - 180
  return { mid, end: at(mid, Math.abs(rel) > FOLD ? a1 + Math.sign(rel) * FOLD : a2, l2) }
}
// the anatomical bend side; a fractional value (a limb passing through straight while blending) keeps its size
const anat = (b, side) => (b == null ? side : side * Math.abs(b))
const mirrorAng = (a, t) => 2 * t - a
function mirrorPt(p, H, t) { // reflect across the torso line through H
  const d = { x: Math.cos(t * R), y: Math.sin(t * R) }, v = { x: p.x - H.x, y: p.y - H.y }, k = v.x * d.x + v.y * d.y
  return { x: H.x + 2 * k * d.x - v.x, y: H.y + 2 * k * d.y - v.y }
}

export function joints(p, view) {
  if (p.fx != null && p.fy == null) p = { ...p, fy: -7 }
  if (p.gx != null && p.gy == null) p = { ...p, gy: -7 }
  const H = { x: p.hx, y: p.hy }, t = p.t
  const d = { x: Math.cos(t * R), y: Math.sin(t * R) }, L = { x: d.y, y: -d.x }, Rt = { x: -d.y, y: d.x } // L = back (side view), Rt = right (front view)
  const S = at(H, t, FIG.torso + (p.sg || 0))
  const C = at(S, t + (p.hd || 0), FIG.neck + FIG.head)
  const HOLD = { back: add(add(S, L, 13), d, -6), rack: add(add(S, L, -13), d, -3), chest: add(add(H, d, 58), L, -25), up: add(add(S, d, FIG.upperArm + FIG.foreArm - 6), L, -6),
    head: add(C, L, 8), hip: add(add(H, L, -15), d, 4) }
  const P = p.hold ? { x: HOLD[p.hold].x + (p.hox || 0), y: HOLD[p.hold].y + (p.hoy || 0) } : p.hp || null
  const front = view === 'f'
  const SR = front ? add(S, Rt, 19) : S, SL = front ? add(S, Rt, -19) : S, HR = front ? add(H, Rt, 11) : H, HL = front ? add(H, Rt, -11) : H
  const a1 = p.ra1 != null ? t + p.ra1 : p.a1, a2 = p.ra2 != null ? t + p.ra2 : p.a2
  const tgt = P || (p.ax != null ? { x: p.ax, y: p.ay } : null)
  const UA = FIG.upperArm * (p.af ?? 1), FA = FIG.foreArm * (p.ff ?? p.af ?? 1), TH = FIG.thigh * (p.tf ?? 1), SH = FIG.shin * (p.sf ?? 1)
  // anatomy (side view): an elbow solved to a target only bends forward (+1), a knee only backward (−1) – the other
  // solution is a hyperextension. Holds (bar on the back, hands behind the head…) and poses marked `eo` (elbow out to
  // the side, where the side view can show it either way) keep the side the scene asked for.
  const freeArm = front || P || p.eo
  const arm = chain(SR, UA, FA, a1, a2, tgt?.x, tgt?.y, freeArm ? p.ab ?? 1 : anat(p.ab, 1))
  let far
  if (p.b1 != null || p.rb1 != null || p.bx != null) far = chain(SL, UA, FA, p.rb1 != null ? t + p.rb1 : p.b1, p.rb2 != null ? t + p.rb2 : p.b2, p.bx, p.by, front || p.eo ? p.bb ?? p.ab ?? 1 : anat(p.bb ?? p.ab, 1))
  else if (front) { const m = tgt && !P ? mirrorPt(tgt, H, t) : P; far = chain(SL, UA, FA, mirrorAng(a1, t), mirrorAng(a2, t), m?.x, m?.y, -(p.ab ?? 1)) }
  else far = arm
  const leg = chain(HR, TH, SH, p.l1, p.l2, p.fx, p.fy, front ? p.lb ?? -1 : anat(p.lb, -1))
  let leg2
  if (p.m1 != null || p.gx != null) leg2 = chain(HL, TH, SH, p.m1, p.m2, p.gx, p.gy, front ? p.gb ?? p.lb ?? -1 : anat(p.gb ?? p.lb, -1))
  else if (front) { const m = p.fx != null ? mirrorPt({ x: p.fx, y: p.fy }, H, t) : null; leg2 = chain(HL, TH, SH, mirrorAng(p.l1, t), mirrorAng(p.l2, t), m?.x, m?.y, -(p.lb ?? -1)) }
  else leg2 = leg
  return { cu: p.cu || 0, H, S, C, P, SR, SL, HR, HL, E: arm.mid, W: arm.end, E2: far.mid, W2: far.end, K: leg.mid, A: leg.end, K2: leg2.mid, A2: leg2.end, d, L }
}

// blend poses; angles take the short way round; many frames = k runs through them in order
const ANG = new Set(['t', 'hd', 'a1', 'a2', 'b1', 'b2', 'ra1', 'ra2', 'rb1', 'rb2', 'l1', 'l2', 'm1', 'm2', 'fo', 'rot'])
const BEND = new Set(['ab', 'bb', 'lb', 'gb']) // bend sides switch, they don't blend
// a bend side flips where that limb is straightest in the move, so the elbow / knee never jumps across
const LIMB = { ab: ['S', 'W'], bb: ['S', 'W2'], lb: ['H', 'A'], gb: ['H', 'A2'] }
const bendOf = (p, key) => (key === 'ab' ? p.ab ?? 1 : key === 'bb' ? p.bb ?? p.ab ?? 1 : key === 'lb' ? p.lb ?? -1 : p.gb ?? p.lb ?? -1)
const NEUTRAL = { af: 1, tf: 1, sf: 1, cu: 0, sg: 0, lift: 0, hd: 0 }
const flipAt = new WeakMap()
function flipPoint(a, b, key) {
  let m = flipAt.get(a); if (!m) flipAt.set(a, (m = new Map()))
  const memo = m.get(b)?.[key]
  if (memo != null) return memo
  const [r, e] = LIMB[key]; let best = 0.5, far = -1
  for (let i = 0; i <= 20; i++) {
    const J = joints(mix2(a, b, i / 20, true))
    const dd = J[r] && J[e] ? Math.hypot(J[e].x - J[r].x, J[e].y - J[r].y) : 0
    if (dd > far + 0.5) { far = dd; best = i / 20 }
  }
  // never straight in this move: swing the joint through the line over a short stretch instead of snapping
  const full = key === 'ab' || key === 'bb' ? FIG.upperArm + FIG.foreArm : FIG.thigh + FIG.shin
  const res = { at: best, soft: far < full * 0.95 }
  m.set(b, { ...m.get(b), [key]: res })
  return res
}
// one frame places a hand / foot by a target, the other by angles: give both a target so the limb moves smoothly
const TGT = [['ax', 'ay', 'W'], ['bx', 'by', 'W2'], ['fx', 'fy', 'A'], ['gx', 'gy', 'A2']]
function fillTargets(a, b) {
  let A = a, B = b
  for (const [x, y, j] of TGT) {
    if ((a[x] == null) === (b[x] == null)) continue
    if (a[x] == null) { const p = joints(a)[j]; A = { ...A, [x]: p.x, [y]: p.y } } else { const p = joints(b)[j]; B = { ...B, [x]: p.x, [y]: p.y } }
  }
  // a foot set in one frame only: the other frame's foot is square to its own shin (else the ankle keeps a stale angle)
  for (const [f, K, An] of [['fo', 'K', 'A'], ['fo2', 'K2', 'A2']]) {
    if ((A[f] == null) === (B[f] == null) || (f === 'fo2' && (A.fo != null || B.fo != null))) continue
    const src = A[f] == null ? A : B, J = joints(src), v = Math.atan2(J[An].y - J[K].y, J[An].x - J[K].x) * 180 / Math.PI - 90
    if (src === A) A = { ...A, [f]: v }; else B = { ...B, [f]: v }
  }
  return [A, B]
}
const filled = new WeakMap()
function mix2(a0, b0, k, raw) {
  let m = filled.get(a0); if (!m) filled.set(a0, (m = new Map()))
  let ab = m.get(b0); if (!ab) m.set(b0, (ab = fillTargets(a0, b0)))
  const [a, b] = ab
  const o = {}
  for (const key of BEND) {
    const x = bendOf(a, key), y = bendOf(b, key)
    if (x === y || raw) { o[key] = x; continue }
    // the switch is spread over a short stretch round the straightest moment (longer when the limb never gets straight);
    // the stretch stays inside the move, so each frame itself keeps its own side and nothing snaps at a frame
    const f = flipPoint(a, b, key), w = f.soft ? 0.2 : 0.08, c = Math.min(1 - w, Math.max(w, f.at)), u = Math.max(0, Math.min(1, (k - (c - w)) / (2 * w)))
    o[key] = x + (y - x) * u
  }
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (BEND.has(key)) continue
    // scales and offsets have a neutral value: a frame without one is at rest, not at the other frame's value
    const dflt = key === 'ff' ? p => p.af ?? 1 : NEUTRAL[key] != null ? () => NEUTRAL[key] : null
    const x = a[key] ?? (dflt ? dflt(a) : b[key]), y = b[key] ?? (dflt ? dflt(b) : a[key])
    if (typeof x !== 'number' || typeof y !== 'number' || BEND.has(key)) { o[key] = k < 0.5 ? x : y; continue }
    let dd = y - x
    if (ANG.has(key)) dd = ((dd % 360) + 540) % 360 - 180
    o[key] = x + dd * k
  }
  // two explicit hold points: the hands travel between them
  if (a.hp && b.hp && !a.hold && !b.hold) o.hp = lerpPt(a.hp, b.hp, k)
  // hands moving between a hold point (rack, back…) and a free target travel in a straight line instead of jumping
  if ((a.hold || b.hold) && a.hold !== b.hold) {
    const ja = joints(a), jb = joints(b), pa = ja.P || ja.W, pb = jb.P || jb.W
    delete o.hold; o.hp = lerpPt(pa, pb, k)
  }
  return o
}
export function poseAt(frames, k) {
  if (frames.length < 2) return frames[0]
  const s = Math.max(0, Math.min(1, k)) * (frames.length - 1), i = Math.min(frames.length - 2, Math.floor(s))
  return mix2(frames[i], frames[i + 1], s - i)
}

const line = (a, b, w, c) => ({ t: 'line', a: { x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'stroke-width': w }, c })
const circle = (p, r, c) => ({ t: 'circle', a: { cx: p.x, cy: p.y, r }, c })
const lerpPt = (A, B, f) => ({ x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f })

// muscle → [segment, from, to, side (+1 = left of its direction, -1 = right, 0 = centre)]
const PAINT = {
  chest: ['torso', 0.55, 0.9, -1], abs: ['torso', 0.12, 0.5, -1], obliques: ['torso', 0.15, 0.5, 0], lowerback: ['torso', 0.1, 0.45, 1],
  lats: ['torso', 0.4, 0.8, 1], upperback: ['torso', 0.72, 0.98, 1], traps: ['neck', 0, 1, 1],
  biceps: ['ua', 0.2, 0.85, 1], triceps: ['ua', 0.2, 0.85, -1], forearms: ['fa', 0.1, 0.75, 0],
  quads: ['th', 0.15, 0.85, 1], hamstrings: ['th', 0.15, 0.85, -1], adductors: ['th', 0.2, 0.7, 0], calves: ['sh', 0.1, 0.55, -1],
}
const ARMS = ['biceps', 'triceps', 'forearms', 'shoulders', 'reardelts']
function paint(J, list, cls, front, only) {
  const out = []
  for (const m of list) {
    if (only && !only.includes(m)) continue
    if (m === 'shoulders') { out.push(circle(front ? J.SR : at(J.S, ang(J.S, J.C), 1), 7.5, cls)); if (front) out.push(circle(J.SL, 7.5, cls)); continue }
    if (m === 'reardelts') { out.push(circle(add(J.S, J.L, front ? 0 : 6), 6, cls)); continue }
    if (m === 'glutes') { if (front) out.push(circle(at(J.HR, ang(J.HL, J.HR), 8), 6, cls), circle(at(J.HL, ang(J.HR, J.HL), 8), 6, cls)); else out.push(circle(add(J.H, J.L, 8), 8, cls)); continue }
    const p = PAINT[m]; if (!p) continue
    const [seg, f0, f1, side0] = p, side = front ? 0 : side0
    const segs = { torso: [[J.H, J.S, FIG.torsoW]], neck: [[J.S, J.C, 9]], ua: [[J.SR, J.E, FIG.armW]], fa: [[J.E, J.W, FIG.foreW]], th: [[J.HR, J.K, FIG.legW]], sh: [[J.K, J.A, FIG.legW - 2]] }[seg]
    if (front && seg !== 'torso' && seg !== 'neck') segs.push({ ua: [J.SL, J.E2, FIG.armW], fa: [J.E2, J.W2, FIG.foreW], th: [J.HL, J.K2, FIG.legW], sh: [J.K2, J.A2, FIG.legW - 2] }[seg])
    if (front && m === 'chest') { const c = lerpPt(J.H, J.S, 0.8), d = ang(J.H, J.S); for (const k of [-1, 1]) { const o = at(c, d + 90 * k, 2); out.push(lens(o, at(o, d + 90 * k, 15), 6, cls)) } continue }
    if (front && m === 'abs') { const a0 = lerpPt(J.H, J.S, 0.15), a1 = lerpPt(J.H, J.S, 0.6); out.push(lens(a0, a1, 7, cls)); continue }
    for (const [A, B, w] of segs) {
      // muscle belly as a filled lens just inside the drawn outline, on the side where the muscle sits
      const wid = seg === 'torso' ? (front ? 22 : 11) : seg === 'neck' ? 8 : w * 0.62
      const n = at({ x: 0, y: 0 }, ang(A, B) - 90, side * (seg === 'torso' ? 9 : w / 2 - wid / 2 + 1))
      // the torso bows with a rounded back (cu): the muscle follows the drawn outline
      const bow = f => (seg === 'torso' && !front && J.cu ? at({ x: 0, y: 0 }, ang(A, B) - 90, J.cu * 16 * Math.sin(Math.PI * f)) : { x: 0, y: 0 })
      const p0 = add(add(lerpPt(A, B, f0), n), bow(f0)), p1 = add(add(lerpPt(A, B, f1), n), bow(f1)), fm = (f0 + f1) / 2
      out.push(lens(p0, p1, wid, cls, add(add(lerpPt(A, B, fm), n), bow(fm))))
    }
  }
  return out
}

// pointed-ended muscle shape
function lens(A, B, w, cls, mid) {
  const d = ang(A, B), M = mid || lerpPt(A, B, 0.5), c1 = add(M, at({ x: 0, y: 0 }, d - 90, w)), c2 = add(M, at({ x: 0, y: 0 }, d + 90, w))
  return { t: 'path', a: { d: `M${A.x} ${A.y}Q${c1.x} ${c1.y} ${B.x} ${B.y}Q${c2.x} ${c2.y} ${A.x} ${A.y}Z` }, c: cls }
}
// muscular limb: widths at the start, at the belly of the muscle (pos 0..1) and at the end; round ends, filled
function seg(A, B, w0, wm, w1, pos, cls) {
  const d = ang(A, B), N = w => at({ x: 0, y: 0 }, d - 90, w / 2), M = { x: A.x + (B.x - A.x) * pos, y: A.y + (B.y - A.y) * pos }
  const a1 = add(A, N(w0)), b1 = add(B, N(w1)), b2 = add(B, N(w1), -1), a2 = add(A, N(w0), -1)
  const c1 = add(M, N(wm * 1.18)), c2 = add(M, N(wm * 1.18), -1)
  return { t: 'path', a: { d: `M${a1.x} ${a1.y}Q${c1.x} ${c1.y} ${b1.x} ${b1.y}A${w1 / 2} ${w1 / 2} 0 0 1 ${b2.x} ${b2.y}Q${c2.x} ${c2.y} ${a2.x} ${a2.y}A${w0 / 2} ${w0 / 2} 0 0 1 ${a1.x} ${a1.y}Z` }, c: cls }
}
const smooth = pts => pts.reduce((s, p, i) => (i === 0 ? `M${p.x} ${p.y}` : i === pts.length - 1 ? s + `L${p.x} ${p.y}` : s + `Q${p.x} ${p.y} ${(p.x + pts[i + 1].x) / 2} ${(p.y + pts[i + 1].y) / 2}`), '')
// side view torso: back (L side) and front profile along hip → shoulder (glutes, lower back, lats, upper back / belly, chest)
const PF = [0, 0.1, 0.3, 0.5, 0.72, 0.9, 1], BACK = [15, 17.5, 12.5, 13.5, 16.5, 17, 11], FRONT = [13, 14, 14, 13.5, 18, 16.5, 11]
function torsoSide(J, cls) {
  // cu: rounded back (spine flexion) – the profile bows out towards the back
  const P = (f, k, side) => add(add(J.H, { x: (J.S.x - J.H.x) * f, y: (J.S.y - J.H.y) * f }), J.L, side * k + J.cu * 16 * Math.sin(Math.PI * f))
  const back = PF.map((f, i) => P(f, BACK[i], 1)), front = PF.map((f, i) => P(f, FRONT[i], -1)).reverse()
  return { t: 'path', a: { d: smooth(back) + `A10 10 0 0 1 ${front[0].x} ${front[0].y}` + smooth(front).replace(/^M/, 'L') + `A12 12 0 0 1 ${back[0].x} ${back[0].y}Z` }, c: cls }
}
// front view torso: V shape – wide shoulders and lats, narrow waist, hips
const FF = [0, 0.16, 0.38, 0.62, 0.84, 1], HALF = [16, 16.5, 14, 17, 21, 21]
function torsoFront(J, cls) {
  const R = { x: -J.d.y, y: J.d.x }
  const P = (f, k, side) => add(add(J.H, { x: (J.S.x - J.H.x) * f, y: (J.S.y - J.H.y) * f }), R, side * k)
  const right = FF.map((f, i) => P(f, HALF[i], 1)), left = FF.map((f, i) => P(f, HALF[i], -1)).reverse()
  const top = add(J.S, J.d, 5), bot = add(J.H, J.d, -10)
  return { t: 'path', a: { d: smooth(right) + `Q${top.x} ${top.y} ${left[0].x} ${left[0].y}` + smooth(left).replace(/^M/, 'L') + `Q${bot.x} ${bot.y} ${right[0].x} ${right[0].y}Z` }, c: cls }
}
// [start, belly, end, belly position] for upper arm, forearm, thigh, shin
const UPPER = [14, 16.5, 10.5, 0.45], FORE = [11, 12.5, 7.5, 0.28], THIGH = [21, 21.5, 13.5, 0.35], SHIN = [13, 15.5, 8.5, 0.3]
const armShapes = (S, E, W, cls, g = 0) => [seg(S, E, UPPER[0] + g, UPPER[1] + g, UPPER[2] + g, UPPER[3], cls), seg(E, W, FORE[0] + g, FORE[1] + g, FORE[2] + g, FORE[3], cls)]
const legShapes = (H, K, A, cls) => [seg(H, K, THIGH[0], THIGH[1], THIGH[2], THIGH[3], cls), seg(K, A, SHIN[0], SHIN[1], SHIN[2], SHIN[3], cls)]
const outline = (S, E, W) => armShapes(S, E, W, 'outf', 5)

function foot(K, A, fo, cls = 'body') {
  const dd = fo ?? ang(K, A) - 90
  return line(at(A, dd + 180, 4), at(A, dd, FIG.foot - 6), 9, cls)
}

function gear(g, J, pose, near) {
  if (g.far) near = false // held in the far hand only
  const W = g.at === 'hold' && J.P ? J.P : g.at === 'back' ? add(lerpPt(J.H, J.S, 0.62), J.L, 15) : g.at === 'elbow' ? J.E : g.at === 'foot' ? J.A : g.at === 'hip' ? J.H : g.at === 'knee' ? at(lerpPt(J.H, J.K, 0.8), ang(J.H, J.K) - 90, 15) : near ? J.W : J.W2, E = near ? J.E : J.E2, f = near ? '' : ' far'
  switch (g.k) {
    case 'bb': return [{ t: 'plate', at: W, r: g.r || 22, far: !near }]
    case 'pl': return [{ t: 'plate', at: W, r: g.r || 15, far: !near }]
    case 'db': { const r = (g.r || 10) * 0.85, o = { x: 8, y: -5 }, A = add(W, o), B = add(W, o, -1); return [circle(A, r, 'gear' + f), circle(A, r, 'rim' + f), line(A, B, 4, 'gear-line' + f), circle(B, r, 'gear' + f), circle(B, r, 'rim' + f)] }
    case 'kb': { const dd = g.up ? ang(E, W) : 90, c = at(W, dd, 11); return [line(W, at(W, dd, 6), 4, 'gear-line' + f), circle(c, 10, 'gear' + f), circle(c, 10, 'rim' + f)] }
    case 'ball': { const c = at(W, g.dir ?? -90, g.off ?? 10); return [circle(c, g.r || 15, 'gear'), circle(c, g.r || 15, 'rim')] }
    case 'handle': return [circle(W, 5, 'gear' + f)]
    case 'cable': { const F = near ? g.from : g.from2 || g.from, d = ang(F, W); return [line(F, W, 1.6, 'cable' + f), line(at(W, d + 90, 7), at(W, d - 90, 7), 4.5, 'gear' + f)] } // handle across the end of the cable
    case 'band': return [line(g.from, W, 3, 'band' + f)]
    case 'bandloop': { // a band with no anchor: around the knees, over the back from hand to hand, or from under the feet to the hands
      if (g.mode === 'knee') { const c = lerpPt(J.H, J.K, 0.85); return [{ t: 'path', a: { d: `M${c.x - 10} ${c.y}a10 6 0 1 0 20 0a10 6 0 1 0 -20 0`, 'stroke-width': 3 }, c: 'band' }] }
      if (g.mode === 'back') { const c = add(J.S, J.L, 34); return [{ t: 'path', a: { d: `M${J.W.x} ${J.W.y}Q${c.x} ${c.y} ${J.W2.x} ${J.W2.y}`, 'stroke-width': 3 }, c: 'band' }] }
      return [line(J.A, J.W, 3, 'band'), ...(J.W2.x !== J.W.x || J.W2.y !== J.W.y ? [line(J.A2, J.W2, 3, 'band far')] : [])]
    }
    case 'pole': return [line(g.from, at(W, ang(g.from, W), g.over ?? 14), 5, 'gear-line' + f)]
    case 'wheel': return [circle(at(W, 90, 6), 11, 'gear'), circle(at(W, 90, 6), 11, 'rim'), circle(at(W, 90, 6), 3, 'hub')]
    case 'roller': { const end = { x: W.x, y: W.y + (pose.rl ?? 60) }; return [line(W, end, 1.5, 'cable'), { t: 'plate', at: { x: end.x, y: end.y + 10 }, r: 11 }] }
    case 'belt': { const end = { x: J.H.x, y: J.H.y + 40 }; return [line(J.H, end, 1.5, 'cable'), { t: 'plate', at: { x: end.x, y: end.y + 12 }, r: 13 }] }
    case 'footpad': { const y = Math.max(J.A.y, J.A2.y) + 7; return [line({ x: Math.min(J.A.x, J.A2.x) - 16, y }, { x: Math.max(J.A.x, J.A2.x) + 16, y }, 9, 'pad')] } // assisted machine platform under the feet
    case 'footband': { const y = Math.max(J.A.y, J.A2.y) + 4, l = Math.min(J.A.x, J.A2.x) - 6, r = Math.max(J.A.x, J.A2.x) + 6; return [line({ x: l, y: g.top }, { x: l, y }, 2.5, 'band'), line({ x: l, y }, { x: r, y }, 2.5, 'band'), line({ x: r, y }, { x: r, y: g.top }, 2.5, 'band')] } // band from the bar under the feet
    case 'backpad': { const a = add(add(J.H, J.L, 17), J.d, -14), b = add(add(J.S, J.L, 17), J.d, 16); return [line(a, b, 13, 'pad')] } // machine back pad moving with the body
    case 'lever': { // machine arm from a fixed pivot (or the knee / elbow) to the hands or the shin roller
      const P0 = g.pivot === 'knee' ? J.K : g.pivot === 'elbow' ? J.E : g.pivot === 'hip' ? J.H : g.pivot
      const T = g.to === 'shoulder' ? add(J.S, J.L, 14) : g.to === 'hip' ? add(J.H, J.L, -16) : g.to === 'foot' ? J.A : g.to === 'roller' ? at(lerpPt(J.K, J.A, 0.86), ang(J.K, J.A) + (g.side ?? -1) * 90, 13) : W
      return [line(P0, T, 7, 'gear frame'), circle(P0, 6, 'gear')]
    }
    case 'lift': { // assisted machine: platform under the knees on a lever from a fixed pivot
      const y = Math.max(J.K.y, J.K2.y) + 10, c = { x: (J.K.x + J.K2.x) / 2, y }
      return [line(g.pivot, c, 7, 'gear frame'), circle(g.pivot, 6, 'gear'), line({ x: c.x - 24, y }, { x: c.x + 24, y }, 10, 'pad')]
    }
    case 'kneepads': { const o = g.side ?? 1, P0 = { x: J.H.x, y: J.H.y + 24 }, a = { x: J.K.x + 13 * o, y: J.K.y }, b = { x: J.K2.x - 13 * o, y: J.K2.y }; return [line(P0, a, 5, 'gear frame'), line(P0, b, 5, 'gear frame'), circle(a, 9, 'pad'), circle(b, 9, 'pad')] } // ab/adductor machine pads outside (1) or inside (-1) the knees, on arms from under the seat
    case 'armpads': return [line(lerpPt(J.SR, J.E, 0.45), at(J.E, ang(J.SR, J.E), 8), 12, 'pad'), line(lerpPt(J.SL, J.E2, 0.45), at(J.E2, ang(J.SL, J.E2), 8), 12, 'pad'), circle(J.SR, 5, 'gear'), circle(J.SL, 5, 'gear')] // lateral-raise machine pads on the upper arms
    case 'pad': { const c = g.at === 'shoulder' ? add(J.S, J.L, 14) : g.at === 'hip' ? add(J.H, J.L, -16) : W; return [circle(c, g.r || 10, 'pad')] } // round machine pad on the body
    case 'deck': return [line({ x: 26, y: g.y }, J.W, 6, 'gear frame'), line({ x: -26, y: g.y }, J.W2, 6, 'gear frame'), line({ x: -34, y: g.y }, { x: 34, y: g.y }, 7, 'gear frame')] // pec-deck arms hanging from pivots above the shoulders
    case 'kneepad': { const d = ang(J.H, J.K), c = at(lerpPt(J.H, J.K, 0.85), d - 90, 14); return [line(at(c, d, -16), at(c, d, 16), 10, 'pad')] } // machine pad on top of the thighs
    case 'fbar': { const d = ang(J.W2, J.W), A = at(J.W2, d, -46), B = at(J.W, d, 46), pl = P => line(at(P, d + 90, 13), at(P, d - 90, 13), 7, 'gear'); return [line(A, B, 4, 'gear-line'), pl(at(J.W2, d, -38)), pl(at(J.W, d, 38))] } // barbell seen from the front, plates on both ends
    case 'bar2': { const d = ang(J.W2, J.W), m = lerpPt(J.W, J.W2, 0.5); return [line({ x: m.x, y: m.y }, { x: m.x, y: g.top ?? -330 }, 1.5, 'cable'), line(at(J.W2, d, -14), at(J.W, d, 14), 5, 'gear frame')] } // straight bar between both hands (front view)
    case 'shin': { const c = at(lerpPt(J.K, J.A, 0.86), ang(J.K, J.A) + (g.side ?? -1) * 90, 13); return [circle(c, 9, 'pad'), circle(c, 3, 'gear')] } // roller on the front (-1) or back (+1) of the shin
    case 'plat': { const a = g.ang ?? 0, c = g.toe != null ? at(at(J.A, pose.fo ?? a + 180, g.toe), a, 5) : at(J.A, a, 9); return [line(at(c, a + 90, 30), at(c, a - 90, 30), 8, 'pad')] }
    case 'rope': { // waving rope from the hands to an anchor
      const A = W, B = g.from, n = 32, pts = [], ph = (pose.wv || 0) + (near ? 0 : Math.PI)
      for (let i = 0; i <= n; i++) { const u = i / n, q = lerpPt(A, B, u), amp = 14 * (1 - u) * Math.min(1, u * 6); pts.push(`${q.x} ${q.y + Math.sin(u * Math.PI) * 8 + Math.sin(u * 2.5 * Math.PI * 2 - ph) * amp}`) }
      return [{ t: 'path', a: { d: 'M' + pts.join(' L'), 'stroke-width': near ? 5 : 4 }, c: 'gear-line' + f }]
    }
    case 'grip': { const s = 6 - (pose.sq ?? 0) * 4; return [line(at(W, -60, 2), at(W, -60, 14), 3, 'gear-line'), line(at(W, -60 + 20 + s * 3, 2), at(W, -60 + 20 + s * 3, 14), 3, 'gear-line')] }
    case 'dbrot': { const a = pose.rot ?? 0; return [line(at(W, a, 14), at(W, a + 180, 14), 3, 'gear-line'), circle(at(W, a, 14), 6, 'gear'), circle(at(W, a + 180, 14), 6, 'gear')] }
  }
  return []
}

function prop(p, pose = {}) {
  switch (p.k) {
    case 'bench': { // x,y = centre of the pad top, len, ang
      const a = p.ang || 0, half = (p.len || 140) / 2, c = { x: p.x, y: p.y + 6 }
      const out = [line(at(c, 180 + a, half), at(c, a, half), 13, 'pad')]
      for (const q of p.legs || [-0.7, 0.7]) { const top = at(c, q < 0 ? 180 + a : a, Math.abs(q) * half); out.push(line({ x: top.x, y: top.y + 4 }, { x: top.x, y: 0 }, 7, 'gear')) }
      return out
    }
    case 'seat': return [line({ x: p.x - (p.w || 44) / 2, y: p.y + 6 }, { x: p.x + (p.w || 44) / 2, y: p.y + 6 }, 12, 'pad'), line({ x: p.x, y: p.y + 10 }, { x: p.x, y: 0 }, 7, 'gear')]
    case 'pad': return [line({ x: p.x1, y: p.y1 }, { x: p.x2, y: p.y2 }, p.w || 12, 'pad')]
    case 'post': return [line({ x: p.x, y: p.y ?? 0 }, { x: p.x2 ?? p.x, y: p.y2 }, p.w || 6, 'gear')]
    case 'bar': return [line({ x: p.x + (p.side ?? -40), y: p.y }, { x: p.x + (p.side ?? -40), y: 0 }, 5, 'gear frame'), line({ x: p.x + (p.side ?? -40), y: p.y }, { x: p.x, y: p.y }, 5, 'gear frame'), circle({ x: p.x, y: p.y }, 5, 'gear')]
    case 'tower': return [line({ x: p.x, y: 0 }, { x: p.x, y: p.top }, 8, 'gear frame'), ...(p.pulley != null ? [circle({ x: p.x, y: p.pulley }, 6, 'gear')] : [])]
    case 'box': return [{ t: 'rect', a: { x: p.x - p.w / 2, y: -p.h, width: p.w, height: p.h, rx: 3 }, c: 'pad' }]
    case 'stack': { // machine weight stack: frame, pulley and plates
      const h = p.h || 230
      /** @type {any[]} */
      const out = [line({ x: p.x - 17, y: 0 }, { x: p.x - 17, y: -h }, 5, 'gear frame'), line({ x: p.x + 17, y: 0 }, { x: p.x + 17, y: -h }, 5, 'gear frame'), line({ x: p.x - 20, y: -h }, { x: p.x + 20, y: -h }, 6, 'gear frame'), circle({ x: p.x, y: -h + 10 }, 6, 'gear'), line({ x: p.x, y: -h + 10 }, { x: p.x, y: -96 }, 1.5, 'cable')]
      // the top plates (the chosen weight) ride up with the movement
      const up = pose.lift || 0
      for (let i = 0; i < 8; i++) out.push({ t: 'rect', a: { x: p.x - 13, y: -14 - i * 11 - (i >= 4 ? up : 0), width: 26, height: 9, rx: 2 }, c: 'pad' })
      out[4] = line({ x: p.x, y: -h + 10 }, { x: p.x, y: -96 - up }, 1.5, 'cable')
      return out
    }
    case 'wall': return [line({ x: p.x, y: 0 }, { x: p.x, y: p.top ?? -280 }, 6, 'gear frame')]
    case 'ball': return [circle({ x: p.x, y: p.y }, p.r, 'pad')]
    case 'line': return [line({ x: p.x1, y: p.y1 }, { x: p.x2, y: p.y2 }, p.w || 4, p.c || 'gear')]
  }
  return []
}

export function draw(scene, pose) {
  const out = drawFig(scene, pose)
  if (scene.inset) out.push(...insetShapes(scene.inset, scene.box))
  return out
}

// equipment / cable attachment pictured in the top-left corner, separated by a line
const INSET = 92
const ICONS = {
  bb: [['l', -32, 0, 32, 0, 3], ['r', -27, -13, 6, 26], ['r', 21, -13, 6, 26], ['r', -20, -6, 3, 12], ['r', 17, -6, 3, 12]],
  ez: [['p', 'M-32 0 L-15 0 L-10 -4 L-5 3 L0 -4 L5 3 L10 -4 L15 0 L32 0', 3], ['r', -27, -11, 6, 22], ['r', 21, -11, 6, 22]],
  db: [['l', -10, 0, 10, 0, 4], ['r', -22, -10, 11, 20], ['r', 11, -10, 11, 20]],
  kb: [['c', 0, 6, 13], ['p', 'M-9 -1 Q-11 -18 0 -18 Q11 -18 9 -1', 4]],
  hx: [['p', 'M-20 0 L-11 -14 L11 -14 L20 0 L11 14 L-11 14 Z', 3], ['l', -32, 0, -20, 0, 3], ['l', 20, 0, 32, 0, 3], ['r', -32, -11, 5, 22], ['r', 27, -11, 5, 22], ['l', -6, -14, 6, -14, 6], ['l', -6, 14, 6, 14, 6]],
  tb: [['l', -30, 12, 26, -6, 3], ['r', -30, 0, 5, 22], ['l', 14, -2, 8, -14, 3], ['l', 14, -2, 22, 8, 3]],
  bd: [['b', 'M-26 0 Q-26 -10 -14 -10 L14 -10 Q26 -10 26 0 Q26 10 14 10 L-14 10 Q-26 10 -26 0 Z', 4]],
  rope: [['k', 0, -24, 0, -16], ['o', 0, -13, 4], ['p', 'M-2 -10 Q-8 2 -11 14', 4], ['p', 'M2 -10 Q8 2 11 14', 4], ['c', -11, 17, 5], ['c', 11, 17, 5]],
  vbar: [['k', 0, -24, 0, -16], ['o', 0, -13, 4], ['p', 'M-2 -10 L-9 4 L-9 18', 4], ['p', 'M2 -10 L9 4 L9 18', 4]],
  bar: [['k', 0, -24, 0, -16], ['o', 0, -13, 4], ['l', 0, -9, 0, 6, 3], ['l', -25, 6, 25, 6, 4]],
  lat: [['k', 0, -24, 0, -16], ['o', 0, -13, 4], ['l', 0, -9, 0, 6, 3], ['p', 'M-33 -4 L-25 6 L25 6 L33 -4', 4]],
  d: [['k', 0, -24, 0, -16], ['o', 0, -13, 4], ['p', 'M0 -9 L-13 10 L13 10 Z', 3], ['l', -10, 10, 10, 10, 6]],
  ankle: [['k', 0, -24, 0, -16], ['o', 0, -13, 4], ['l', 0, -9, 0, -2, 3], ['r', -15, -2, 30, 16]],
}
function insetShapes({ kind, label }, box) {
  const k = box.w / 380, x0 = box.x + 6 * k, y0 = box.y + 8 * k, cx = x0 + (INSET / 2 - 2) * k, cy = y0 + 30 * k
  const P = (x, y) => ({ x: cx + x * k * 1.15, y: cy + y * k * 1.15 })
  const path = d => d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x, y) => { const q = P(+x, +y); return `${q.x} ${q.y}` })
  /** @type {any[]} */
  const out = [line({ x: x0 + (INSET - 6) * k, y: y0 }, { x: x0 + (INSET - 6) * k, y: y0 + 76 * k }, 1.5 * k, 'ins-l')]
  for (const [t, a, b, c, d, w] of ICONS[kind] || []) {
    if (t === 'l') out.push(line(P(a, b), P(c, d), w * k, 'gear-line ins'))
    else if (t === 'k') out.push(line(P(a, b), P(c, d), 1.6 * k, 'cable'))
    else if (t === 'r') out.push({ t: 'rect', a: { x: P(a, b).x, y: P(a, b).y, width: c * k, height: d * k, rx: 3 * k }, c: 'pad' })
    else if (t === 'c') out.push(circle(P(a, b), c * k, 'pad'))
    else if (t === 'o') out.push({ t: 'circle', a: { cx: P(a, b).x, cy: P(a, b).y, r: c * k, 'stroke-width': 2.5 * k }, c: 'gear-line ins' })
    else out.push({ t: 'path', a: { d: path(a), 'stroke-width': b * k }, c: t === 'b' ? 'band' : 'gear-line ins' })
  }
  out.push({ t: 'text', a: { x: cx, y: y0 + 70 * k, 'font-size': 12.5 * k, 'text-anchor': 'middle' }, c: 'ins-t', txt: label })
  return out
}

function drawFig(scene, pose) {
  const front = scene.view === 'f'
  const J = joints(pose, scene.view)
  const g = scene.gear || [], main = scene.main || [], help = scene.help || []
  const out = (scene.props || []).flatMap(q => prop(q, pose))
  const both = g.filter(x => x.both)
  if (front) {
    const ff = (K, A, side) => { const o = ang(J.H, J.S) + 90 * side; return line(at(A, o, -2), at(A, o, 6), 10, 'body') }
    out.push(...legShapes(J.HL, J.K2, J.A2, 'bodyf'), ff(J.K2, J.A2, -1))
    out.push(...legShapes(J.HR, J.K, J.A, 'bodyf'), ff(J.K, J.A, 1))
    out.push(line(J.S, J.C, 13, 'limb'), torsoFront(J, 'bodyf'), circle(J.C, FIG.head, 'body'))
    out.push({ t: 'path', a: { d: arc(J.C, FIG.head + 0.5, ang(J.S, J.C) - 70, ang(J.S, J.C) + 70), 'stroke-width': 4 }, c: 'hair' })
    out.push(...g.filter(x => x.z === 'back').flatMap(x => gear(x, J, pose, true)))
    out.push(...paint(J, help.filter(m => !ARMS.includes(m)), 'accent soft', true), ...paint(J, main.filter(m => !ARMS.includes(m)), 'accent', true))
    for (const [S0, E, W] of [[J.SL, J.E2, J.W2], [J.SR, J.E, J.W]]) out.push(...outline(S0, E, W), ...armShapes(S0, E, W, 'nearf'), circle(S0, 9, 'nearf'))
    out.push(...paint(J, help, 'accent soft', true, ARMS), ...paint(J, main, 'accent', true, ARMS))
    out.push(...both.flatMap(x => gear(x, J, pose, false)), ...g.filter(x => x.z !== 'back').flatMap(x => gear(x, J, pose, true)))
    out.push(circle(J.W, FIG.hand, 'hand'), circle(J.W2, FIG.hand, 'hand'))
    return out
  }
  if (J.K2 !== J.K) out.push(...legShapes(J.H, J.K2, J.A2, 'farf'), foot(J.K2, J.A2, pose.fo2 ?? pose.fo, 'far'))
  if (J.E2 !== J.E) { out.push(...both.flatMap(x => gear(x, J, pose, false))); out.push(...armShapes(J.S, J.E2, J.W2, 'farf'), circle(J.W2, FIG.hand - 0.5, 'far')) }
  out.push(...g.filter(x => x.z === 'back').flatMap(x => gear(x, J, pose, true)))
  // which way the back of the head is (towards L): hair there, nose on the other side
  const top = ang(J.S, J.C), dl = ((Math.atan2(J.L.y, J.L.x) * 180 / Math.PI - top + 540) % 360) - 180, sb = dl >= 0 ? 1 : -1
  const nose = at(at(J.C, top - sb * 80, FIG.head - 0.5), top + 180, 1)
  out.push(line(J.S, J.C, 12, 'limb'), torsoSide(J, 'bodyf'), circle(J.C, FIG.head, 'body'), circle(nose, 3.4, 'body'))
  { const h0 = top - sb * 25, h1 = top + sb * 115; out.push({ t: 'path', a: { d: arc(J.C, FIG.head + 0.5, Math.max(h0, h1), Math.min(h0, h1)), 'stroke-width': 4 }, c: 'hair' }) }
  out.push(...legShapes(J.H, J.K, J.A, 'bodyf'), foot(J.K, J.A, pose.fo))
  out.push(...paint(J, help.filter(m => !ARMS.includes(m)), 'accent soft'), ...paint(J, main.filter(m => !ARMS.includes(m)), 'accent'))
  out.push(...g.filter(x => x.z === 'mid').flatMap(x => gear(x, J, pose, true)))
  out.push(...outline(J.S, J.E, J.W), circle(J.S, 12.5, 'outf'), circle(J.S, 9.5, 'nearf'), ...armShapes(J.S, J.E, J.W, 'nearf'))
  out.push(...paint(J, help, 'accent soft', false, ARMS), ...paint(J, main, 'accent', false, ARMS))
  out.push(...g.filter(x => !x.z || x.z === 'front').flatMap(x => gear(x, J, pose, true)))
  out.push(circle(J.W, FIG.hand, 'hand'))
  return out
}
function arc(c, r, a0, a1) {
  const p = at(c, a0, r), q = at(c, a1, r)
  return `M${p.x} ${p.y} A${r} ${r} 0 0 0 ${q.x} ${q.y}`
}

// view box fitting every frame, in the 380 × 250 shape
export function frameBox(scene) {
  const pts = []
  for (const f of scene.frames) { const J = joints(f, scene.view); pts.push(J.H, J.S, J.C, J.E, J.W, J.E2, J.W2, J.K, J.A, J.K2, J.A2) }
  for (const p of scene.props || []) {
    if (p.x != null) pts.push({ x: p.x + (p.k === 'box' ? p.w / 2 : p.k === 'stack' ? 20 : 0), y: p.y ?? (p.top ?? -(p.h || (p.k === 'stack' ? 230 : 0))) }, ...(scene.top ? [] : [{ x: p.x - (p.k === 'box' ? p.w / 2 : 0), y: 0 }]))
    if (p.x1 != null) pts.push({ x: p.x1, y: p.y1 }, { x: p.x2, y: p.y2 })
  }
  for (const g of scene.gear || []) { if (g.from) pts.push(g.from); if (g.from2) pts.push(g.from2); if (g.pivot?.x != null) pts.push(g.pivot) }
  let x0 = Math.min(...pts.map(p => p.x)) - 36, x1 = Math.max(...pts.map(p => p.x)) + 36
  let y0 = Math.min(...pts.map(p => p.y)) - 40, y1 = scene.top ? Math.max(...pts.map(p => p.y)) + 36 : 16
  const want = 380 / 250
  const fit = () => { const w = x1 - x0, h = y1 - y0; if (w / h < want) { const nw = h * want; x0 -= (nw - w) / 2; x1 = x0 + nw } else { const nh = w / want; y0 -= nh - h } }
  fit()
  // room on the left for the equipment picture: it scales with the final box, so reserve its share of the width
  if (scene.inset) { x0 -= INSET * (x1 - x0) / (380 - INSET); fit() }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}
