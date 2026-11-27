import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
import { seed, load } from './seed.mjs'
const b = await launch()
const ctx = await b.newContext({ ...devices['iPhone 15'] }); await ctx.addInitScript(en => { localStorage.setItem('onboarded', '1'); localStorage.setItem('look', '{"mode":"dark"}'); if (en) localStorage.setItem('lang', 'en') }, !!process.env.EN)
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
await load(p, seed())
await p.evaluate(async () => { await new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const tx = r.result.transaction('keyval', 'readwrite'); const W = {}; [[29,108],[27,108],[25,105.8],[24,106.5],[23,107.6],[22,106.5],[21,107.3],[7,106.1],[6,106],[5,105.8],[4,106.6],[3,106.2],[2,106.6],[1,105.5],[0,105.1]].forEach(([n,kg]) => W[new Date(Date.now()-n*864e5).toISOString().slice(0,10)] = { kg, t: 1 }); tx.objectStore('keyval').put(W, 'weights'); tx.oncomplete = res } }) })
await p.goto('http://localhost:4173/#/weight'); await p.reload(); await p.waitForTimeout(1800)
const st = (await p.locator('.stats4').innerText()).replace(/\s+/g, ' '), est = (await p.locator('.est').innerText()).replace(/\s+/g, ' ')
console.log(st); console.log(est)
// pace from averages (2 weeks vs the 2 weeks before), start = first week's average, estimates shown
const en = !!process.env.EN
if (!st.includes(en ? '−1.2' : '−1,2') || !st.includes(en ? '−0.3' : '−0,3')) console.log('FAIL stats: start change / pace')
if (!est.includes(en ? '−0.33' : '−0,33') || !est.includes('370') || !/(Za 4 tygodnie|In 4 weeks)/.test(est)) console.log('FAIL estimates card')
if (!(await p.locator('.c-note').isVisible())) console.log('FAIL chart note')
await p.locator('.chart-card').scrollIntoViewIfNeeded(); await p.waitForTimeout(500)
const bx = await p.locator('.chart-wrap canvas').boundingBox()
await p.mouse.click(bx.x + bx.width * 0.55, bx.y + bx.height / 2); await p.waitForTimeout(400)
if (!(bx.height > 200)) console.log('FAIL chart height')
// an old log (last weigh-in 30 days ago): no pace, a hint to weigh in, no estimates card
await p.evaluate(async () => { await new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const tx = r.result.transaction('keyval', 'readwrite'); const W = {}; [[60, 108], [50, 107], [40, 106.4], [30, 106]].forEach(([n, kg]) => W[new Date(Date.now() - n * 864e5).toISOString().slice(0, 10)] = { kg, t: 1 }); tx.objectStore('keyval').put(W, 'weights'); tx.oncomplete = res } }) })
await p.reload(); await p.waitForTimeout(1500)
const v = (await p.locator('.verdict').innerText()).replace(/\s+/g, ' ')
console.log('stale:', v)
if (!/(Dawno bez pomiaru|No weigh-in for a while)/.test(v) || await p.locator('.est').count()) console.log('FAIL stale pace shown as current')
console.log('errs', errs); await b.close()
