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

function chain(root, l1, l2, a1, a2, tx, ty, bend) {
  if (tx != null && ty != null) {
    const dx = tx - root.x, dy = ty - root.y, full = Math.hypot(dx, dy) || 1e-6
    const d = Math.max(Math.abs(l1 - l2) + 0.5, Math.min(full, l1 + l2 - 0.3))
    const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))) / R
    const mid = at(root, Math.atan2(dy, dx) / R + (bend >= 0 ? a : -a), l1)
    return { mid, end: at(mid, ang(mid, { x: root.x + dx * d / full, y: root.y + dy * d / full }), l2) }
  }
  const mid = at(root, a1, l1)
  return { mid, end: at(mid, a2, l2) }
}
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
  const P = p.hold ? { x: HOLD[p.hold].x + (p.hox || 0), y: HOLD[p.hold].y + (p.hoy || 0) } : null
  const front = view === 'f'
  const SR = front ? add(S, Rt, 19) : S, SL = front ? add(S, Rt, -19) : S, HR = front ? add(H, Rt, 10) : H, HL = front ? add(H, Rt, -10) : H
  const a1 = p.ra1 != null ? t + p.ra1 : p.a1, a2 = p.ra2 != null ? t + p.ra2 : p.a2
  const tgt = P || (p.ax != null ? { x: p.ax, y: p.ay } : null)
  const arm = chain(SR, FIG.upperArm, FIG.foreArm, a1, a2, tgt?.x, tgt?.y, p.ab ?? 1)
  let far
  if (p.b1 != null || p.rb1 != null || p.bx != null) far = chain(SL, FIG.upperArm, FIG.foreArm, p.rb1 != null ? t + p.rb1 : p.b1, p.rb2 != null ? t + p.rb2 : p.b2, p.bx, p.by, p.bb ?? p.ab ?? 1)
  else if (front) { const m = tgt && !P ? mirrorPt(tgt, H, t) : P; far = chain(SL, FIG.upperArm, FIG.foreArm, mirrorAng(a1, t), mirrorAng(a2, t), m?.x, m?.y, -(p.ab ?? 1)) }
  else far = arm
  const leg = chain(HR, FIG.thigh, FIG.shin, p.l1, p.l2, p.fx, p.fy, p.lb ?? -1)
  let leg2
  if (p.m1 != null || p.gx != null) leg2 = chain(HL, FIG.thigh, FIG.shin, p.m1, p.m2, p.gx, p.gy, p.gb ?? p.lb ?? -1)
  else if (front) { const m = p.fx != null ? mirrorPt({ x: p.fx, y: p.fy }, H, t) : null; leg2 = chain(HL, FIG.thigh, FIG.shin, mirrorAng(p.l1, t), mirrorAng(p.l2, t), m?.x, m?.y, -(p.lb ?? -1)) }
  else leg2 = leg
  return { H, S, C, P, SR, SL, HR, HL, E: arm.mid, W: arm.end, E2: far.mid, W2: far.end, K: leg.mid, A: leg.end, K2: leg2.mid, A2: leg2.end, d, L }
}

// blend poses; angles take the short way round; many frames = k runs through them in order
const ANG = new Set(['t', 'hd', 'a1', 'a2', 'b1', 'b2', 'ra1', 'ra2', 'rb1', 'rb2', 'l1', 'l2', 'm1', 'm2', 'fo', 'rot'])
function mix2(a, b, k) {
  const o = {}
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key] ?? b[key], y = b[key] ?? a[key]
    if (typeof x !== 'number' || typeof y !== 'number') { o[key] = k < 0.5 ? x : y; continue }
    let dd = y - x
    if (ANG.has(key)) dd = ((dd % 360) + 540) % 360 - 180
    o[key] = x + dd * k
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
const ARMS = ['biceps', 'triceps', 'forearms']
function paint(J, list, cls, front, only) {
  const out = []
  for (const m of list) {
    if (only && !only.includes(m)) continue
    if (m === 'shoulders') { out.push(circle(front ? J.SR : at(J.S, ang(J.S, J.C), 1), 7.5, cls)); if (front) out.push(circle(J.SL, 7.5, cls)); continue }
    if (m === 'reardelts') { out.push(circle(add(J.S, J.L, front ? 0 : 6), 6, cls)); continue }
    if (m === 'glutes') { out.push(circle(add(J.H, J.L, front ? 0 : 8), 8, cls)); continue }
    const p = PAINT[m]; if (!p) continue
    const [seg, f0, f1, side0] = p, side = front ? 0 : side0
    const segs = { torso: [[J.H, J.S, FIG.torsoW]], neck: [[J.S, J.C, 9]], ua: [[J.SR, J.E, FIG.armW]], fa: [[J.E, J.W, FIG.foreW]], th: [[J.HR, J.K, FIG.legW]], sh: [[J.K, J.A, FIG.legW - 2]] }[seg]
    if (front && seg !== 'torso' && seg !== 'neck') segs.push({ ua: [J.SL, J.E2, FIG.armW], fa: [J.E2, J.W2, FIG.foreW], th: [J.HL, J.K2, FIG.legW], sh: [J.K2, J.A2, FIG.legW - 2] }[seg])
    if (front && m === 'chest') { const c = lerpPt(J.H, J.S, 0.78); out.push(line(add(c, at({ x: 0, y: 0 }, ang(J.H, J.S) + 90, 10), 1), add(c, at({ x: 0, y: 0 }, ang(J.H, J.S) - 90, 10), 1), 7, cls)); continue }
    for (const [A, B, w] of segs) {
      const n = at({ x: 0, y: 0 }, ang(A, B) - 90, side * (w / 2 - 3))
      out.push(line(add(lerpPt(A, B, f0), n), add(lerpPt(A, B, f1), n), side ? 5 : 4, cls))
    }
  }
  return out
}

function foot(K, A, fo, cls = 'body') {
  const dd = fo ?? ang(K, A) - 90
  return line(at(A, dd + 180, 4), at(A, dd, FIG.foot - 6), 9, cls)
}

function gear(g, J, pose, near) {
  const W = g.at === 'hold' && J.P ? J.P : near ? J.W : J.W2, E = near ? J.E : J.E2, f = near ? '' : ' far'
  switch (g.k) {
    case 'bb': return [{ t: 'plate', at: W, r: g.r || 22, far: !near }]
    case 'pl': return [{ t: 'plate', at: W, r: g.r || 15, far: !near }]
    case 'db': return [circle(W, g.r || 10, 'gear' + f), circle(W, g.r || 10, 'rim' + f), circle(W, 3, 'hub' + f)]
    case 'kb': { const dd = g.up ? ang(E, W) : 90, c = at(W, dd, 11); return [line(W, at(W, dd, 6), 4, 'gear-line' + f), circle(c, 10, 'gear' + f), circle(c, 10, 'rim' + f)] }
    case 'ball': { const c = at(W, g.dir ?? -90, g.off ?? 10); return [circle(c, g.r || 15, 'gear'), circle(c, g.r || 15, 'rim')] }
    case 'handle': return [circle(W, 5, 'gear' + f)]
    case 'cable': return [line(g.from, W, 1.6, 'cable' + f), circle(W, 4, 'gear' + f)]
    case 'band': return [line(g.from, W, 3, 'band' + f)]
    case 'pole': return [line(g.from, at(W, ang(g.from, W), g.over ?? 14), 5, 'gear-line' + f)]
    case 'wheel': return [circle(at(W, 90, 6), 11, 'gear'), circle(at(W, 90, 6), 11, 'rim'), circle(at(W, 90, 6), 3, 'hub')]
    case 'roller': { const end = { x: W.x, y: W.y + (pose.rl ?? 60) }; return [line(W, end, 1.5, 'cable'), { t: 'plate', at: { x: end.x, y: end.y + 10 }, r: 11 }] }
    case 'belt': { const end = { x: J.H.x, y: J.H.y + 40 }; return [line(J.H, end, 1.5, 'cable'), { t: 'plate', at: { x: end.x, y: end.y + 12 }, r: 13 }] }
    case 'shin': return [line(at(J.A, ang(J.K, J.A) - 90, 6), at(J.A, ang(J.K, J.A) + 90, 6), 10, 'pad')]
    case 'plat': { const a = g.ang ?? 0, c = at(J.A, a, 6); return [line(at(c, a + 90, 30), at(c, a - 90, 30), 8, 'pad')] }
    case 'rope': { // waving rope from the hands to an anchor
      const A = W, B = g.from, n = 24, pts = []
      for (let i = 0; i <= n; i++) { const q = lerpPt(A, B, i / n), amp = 9 * (1 - i / n); pts.push(`${q.x} ${q.y + Math.sin((i / n) * 3 * Math.PI * 2 - (pose.wv || 0)) * amp}`) }
      return [{ t: 'path', a: { d: 'M' + pts.join(' L'), 'stroke-width': 4 }, c: 'gear-line' }]
    }
    case 'grip': { const s = 6 - (pose.sq ?? 0) * 4; return [line(at(W, -60, 2), at(W, -60, 14), 3, 'gear-line'), line(at(W, -60 + 20 + s * 3, 2), at(W, -60 + 20 + s * 3, 14), 3, 'gear-line')] }
    case 'dbrot': { const a = pose.rot ?? 0; return [line(at(W, a, 14), at(W, a + 180, 14), 3, 'gear-line'), circle(at(W, a, 14), 6, 'gear'), circle(at(W, a + 180, 14), 6, 'gear')] }
  }
  return []
}

function prop(p) {
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
    case 'wall': return [line({ x: p.x, y: 0 }, { x: p.x, y: p.top ?? -280 }, 6, 'gear frame')]
    case 'ball': return [circle({ x: p.x, y: p.y }, p.r, 'pad')]
    case 'line': return [line({ x: p.x1, y: p.y1 }, { x: p.x2, y: p.y2 }, p.w || 4, p.c || 'gear')]
  }
  return []
}

export function draw(scene, pose) {
  const front = scene.view === 'f'
  const J = joints(pose, scene.view)
  const g = scene.gear || [], main = scene.main || [], help = scene.help || []
  const out = (scene.props || []).flatMap(prop)
  const both = g.filter(x => x.both)
  if (front) {
    out.push(line(J.HL, J.K2, FIG.legW, 'limb'), line(J.K2, J.A2, FIG.legW - 2, 'limb'), foot(J.K2, J.A2, pose.fo2 ?? (pose.fo != null ? 180 - pose.fo : ang(J.K2, J.A2) + 90)))
    out.push(line(J.HR, J.K, FIG.legW, 'limb'), line(J.K, J.A, FIG.legW - 2, 'limb'), foot(J.K, J.A, pose.fo))
    out.push(line(J.H, J.S, 34, 'limb'), line(J.S, J.C, 9, 'limb'), circle(J.C, FIG.head, 'body'))
    out.push({ t: 'path', a: { d: arc(J.C, FIG.head + 0.5, ang(J.S, J.C) - 70, ang(J.S, J.C) + 70), 'stroke-width': 4 }, c: 'hair' })
    out.push(...g.filter(x => x.z === 'back').flatMap(x => gear(x, J, pose, true)))
    out.push(...paint(J, help, 'accent soft', true), ...paint(J, main, 'accent', true))
    for (const [S0, E, W] of [[J.SL, J.E2, J.W2], [J.SR, J.E, J.W]]) out.push(line(S0, E, FIG.armW + 5, 'outline'), line(E, W, FIG.foreW + 5, 'outline'), line(S0, E, FIG.armW, 'near'), line(E, W, FIG.foreW, 'near'))
    out.push(...paint(J, help, 'accent soft', true, ARMS), ...paint(J, main, 'accent', true, ARMS))
    out.push(...both.flatMap(x => gear(x, J, pose, false)), ...g.filter(x => x.z !== 'back').flatMap(x => gear(x, J, pose, true)))
    out.push(circle(J.W, FIG.hand, 'hand'), circle(J.W2, FIG.hand, 'hand'))
    return out
  }
  if (J.K2 !== J.K) out.push(line(J.H, J.K2, FIG.legW, 'far'), line(J.K2, J.A2, FIG.legW - 2, 'far'), foot(J.K2, J.A2, pose.fo2 ?? pose.fo, 'far'))
  if (J.E2 !== J.E) { out.push(...both.flatMap(x => gear(x, J, pose, false))); out.push(line(J.S, J.E2, FIG.armW, 'far'), line(J.E2, J.W2, FIG.foreW, 'far'), circle(J.W2, FIG.hand - 0.5, 'far')) }
  out.push(...g.filter(x => x.z === 'back').flatMap(x => gear(x, J, pose, true)))
  out.push(line(J.H, J.S, FIG.torsoW, 'limb'), line(J.S, J.C, 9, 'limb'), circle(J.C, FIG.head, 'body'))
  const top = ang(J.S, J.C)
  out.push({ t: 'path', a: { d: arc(J.C, FIG.head + 0.5, top + 25, top - 115), 'stroke-width': 4 }, c: 'hair' })
  out.push(line(J.H, J.K, FIG.legW, 'limb'), line(J.K, J.A, FIG.legW - 2, 'limb'), foot(J.K, J.A, pose.fo))
  out.push(...paint(J, help.filter(m => !ARMS.includes(m)), 'accent soft'), ...paint(J, main.filter(m => !ARMS.includes(m)), 'accent'))
  out.push(...g.filter(x => x.z === 'mid').flatMap(x => gear(x, J, pose, true)))
  out.push(line(J.S, J.E, FIG.armW + 5, 'outline'), line(J.E, J.W, FIG.foreW + 5, 'outline'), line(J.S, J.E, FIG.armW, 'near'), line(J.E, J.W, FIG.foreW, 'near'))
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
    if (p.x != null) pts.push({ x: p.x + (p.k === 'box' ? p.w / 2 : 0), y: p.y ?? (p.top ?? -(p.h || 0)) }, { x: p.x - (p.k === 'box' ? p.w / 2 : 0), y: 0 })
    if (p.x1 != null) pts.push({ x: p.x1, y: p.y1 }, { x: p.x2, y: p.y2 })
  }
  for (const g of scene.gear || []) if (g.from) pts.push(g.from)
  let x0 = Math.min(...pts.map(p => p.x)) - 36, x1 = Math.max(...pts.map(p => p.x)) + 36
  let y0 = Math.min(...pts.map(p => p.y)) - 40, y1 = 16
  const w = x1 - x0, h = y1 - y0, want = 380 / 250
  if (w / h < want) { const nw = h * want; x0 -= (nw - w) / 2; x1 = x0 + nw } else { const nh = w / want; y0 -= nh - h }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}
