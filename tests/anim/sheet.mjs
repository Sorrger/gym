// Dev tool: contact sheet of every exercise animation (3 moments each) → /tmp/anim/sheet-N.html (+ PNG with Chrome).
// node tests/anim/sheet.mjs [filter]
import fs from 'fs'
import { execFileSync } from 'child_process'
import { BASES, fullSel, compose } from '../../src/catalog.js'
import { sceneFor } from '../../src/anim/scenes.js'
import { draw, poseAt } from '../../src/anim/rig.js'
const only = process.argv[2]
const css = `.xa{--box:#ececf1;--fig:#77777d;background:#ececf1;border-radius:10px}.shadow{fill:#dcdce2}.ground{stroke:#bbb}.gear,.plate-fill{fill:#b0b0b6}.pad{fill:#97979d;stroke:#97979d;stroke-linecap:round}rect.pad{stroke:none}
line.gear,.gear-line,.frame{stroke:#b0b0b6;stroke-linecap:round;fill:none}.frame{stroke:#c8c8cc}.cable{stroke:#999;fill:none}.band{stroke:#7a4df0;opacity:.55}.rim{fill:none;stroke:#77777d;stroke-width:2}.hub{fill:#77777d}
.body{fill:#77777d;stroke:#77777d;stroke-linecap:round}circle.body{stroke:none}.limb,.near,.outline,.accent,.hair,.far{fill:none;stroke-linecap:round;stroke-linejoin:round}.limb{stroke:#77777d}.far{stroke:#b4b4ba}circle.far{fill:#b4b4ba;stroke:none}
.outline{stroke:#ececf1}.bodyf{fill:#77777d}.farf{fill:#b4b4ba}.nearf{fill:#444449}.outf{fill:#ececf1}.near{stroke:#444449}.hand{fill:#333;stroke:#ececf1;stroke-width:2}.accent{stroke:#6a3df0}circle.accent,path.accent{fill:#6a3df0;stroke:none}.soft{opacity:.45}.hair{stroke:#9a9aa0}.plate-rim{fill:none;stroke:#77777d;stroke-width:2}.plate-ring{fill:none;stroke:#77777d;opacity:.5}.plate-hub{fill:#77777d}.far.plate,.gear.far{opacity:.55}`
const attrs = a => Object.entries(a || {}).filter(([, v]) => v != null && !Number.isNaN(v)).map(([k, v]) => `${k}="${v}"`).join(' ')
const plate = s => `<g transform="translate(${s.at.x} ${s.at.y})" class="plate${s.far ? ' far' : ''}"><circle r="${s.r}" class="plate-fill"/><circle r="${s.r}" class="plate-rim"/><circle r="${s.r * 0.7}" class="plate-ring"/><circle r="4" class="plate-hub"/></g>`
function svg(sc, k) {
  const parts = sc.rig ? draw(sc, poseAt(sc.frames, k)) : sc.frame(k)
  const b = sc.box || { x: 0, y: 0, w: 380, h: 250 }
  const inner = [...(sc.rig && !sc.top ? [`<line class="ground" x1="${b.x}" y1="0" x2="${b.x + b.w}" y2="0" stroke-width="2"/>`] : []), ...parts.filter(p => p.under).map(plate), ...(sc.back || []).map(s => `<${s.t} class="${s.c}" ${attrs(s.a)}/>`), ...parts.filter(p => !p.under).map(s => (s.t === 'plate' ? plate(s) : `<${s.t} class="${s.c}" ${attrs(s.a)}/>`))].join('')
  return `<svg class="xa" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" width="${process.env.W || 190}" height="${Math.round((process.env.W || 190) * 125 / 190)}">${inner}</svg>`
}
const cells = []
for (const b of BASES) {
  if (only && !b.id.includes(only)) continue
  const sels = process.env.SEL ? [fullSel(b, JSON.parse(process.env.SEL))] : [fullSel(b)]
  for (const ax of process.env.SEL ? [] : (process.env.AX || 'pos,v,angle').split(',')) for (const val of (ax === 'v' ? (b.v || []).map(x => x[0]) : b.o[ax] || []).slice(1)) { const s = fullSel(b, { ...fullSel(b), [ax]: val }); if (s[ax] === val) sels.push(s) }
  for (const sel of sels) {
    const c = compose(b, sel)
    let sc
    try { sc = sceneFor(b.id, sel, { main: c.main, help: c.help }) } catch (e) { cells.push(`<div class="c err"><b>${c.name}</b><p>${e.message}</p></div>`); continue }
    if (!sc) { cells.push(`<div class="c err"><b>${c.name}</b><p>brak</p></div>`); continue }
    cells.push(`<div class="c"><b>${c.name}</b><div>${(process.env.KS || '0,0.5,1').split(',').map(Number).map(k => svg(sc, k)).join('')}</div></div>`)
  }
}
fs.mkdirSync('/tmp/anim', { recursive: true })
const per = 12, pages = Math.ceil(cells.length / per)
for (let i = 0; i < pages; i++) {
  const f = `/tmp/anim/sheet-${i}.html`
  fs.writeFileSync(f, `<html><head><style>${css}body{font:12px sans-serif;margin:8px;display:grid;grid-template-columns:repeat(${process.env.COLS || 2},${(process.env.W || 190) * (process.env.KS || "0,0.5,1").split(",").length + 30}px);gap:6px}.c{background:#fff;padding:4px}.c div{display:flex;gap:4px}.err{background:#fdd}</style></head><body>${cells.slice(i * per, (i + 1) * per).join('')}</body></html>`)
  execFileSync('/usr/bin/google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--window-size=1230,1000', `--screenshot=/tmp/anim/sheet-${i}.png`, 'file://' + f], { stdio: 'ignore' })
}
console.log(cells.length, 'cells,', pages, 'pages; errors:', cells.filter(c => c.includes('class="c err"')).length)
