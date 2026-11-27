import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
import { seed, load } from './seed.mjs'
const b = await launch()
const ctx = await b.newContext({ ...devices['iPhone 15'] }); await ctx.addInitScript(en => { localStorage.setItem('onboarded', '1'); localStorage.setItem('look', '{"mode":"dark"}'); if (en) localStorage.setItem('lang', 'en') }, !!process.env.EN)
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
await load(p, seed())
await p.evaluate(async () => { await new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const tx = r.result.transaction('keyval', 'readwrite'); const W = {}; [[29,108],[27,108],[25,105.8],[24,106.5],[23,107.6],[22,106.5],[21,107.3],[7,106.1],[6,106],[5,105.8],[4,106.6],[3,106.2],[2,106.6],[1,105.5],[0,105.1]].forEach(([n,kg]) => W[new Date(Date.now()-n*864e5).toISOString().slice(0,10)] = { kg, t: 1 }); tx.objectStore('keyval').put(W, 'weights'); tx.oncomplete = res } }) })
await p.goto('http://localhost:4173/#/weight'); await p.reload(); await p.waitForTimeout(1800)
if (!p.url().includes('#/tabs/progress/weight') || !(await p.locator('ion-tab-bar:visible').count())) console.log('FAIL weight page should keep the tab bar', p.url())
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
// calories: 2500 a day for a month → burn and advice; 0,3 % pace asks for less of a cut
await p.locator('.kcal .soft-btn').click(); await p.waitForTimeout(400)
await p.locator('.dlg input').fill('2500'); await p.locator('.dlg button', { hasText: /Od miesiąca|For a month/ }).click(); await p.locator('.dlg-btn', { hasText: /Zapisz|Save/ }).click(); await p.waitForTimeout(700)
const k1 = (await p.locator('.kcal').innerText()).replace(/\s+/g, ' ')
console.log('kcal:', k1)
const burn = +(k1.match(/(?:ok\.|about) (\d{4}) kcal/) || [])[1], eat = +(k1.match(/(?:Jedz ok\.|Eat about) (\d{4})/) || [])[1]
if (!(burn > 2700 && burn < 3000) || !(eat > 2150 && eat < 2400) || !/(mniej niż teraz|less than now)/.test(k1)) console.log('FAIL calories: burn / advice', burn, eat)
await p.locator('.kcal .seg3 button', { hasText: '0,3' }).first().click(); await p.waitForTimeout(400)
const eat2 = +((await p.locator('.kcal').innerText()).replace(/\s+/g, ' ').match(/(?:Jedz ok\.|Eat about) (\d{4})/) || [])[1]
if (!(eat2 > eat)) console.log('FAIL slower pace should allow more food', eat, eat2)
const saved = await p.evaluate(() => new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const q = r.result.transaction('keyval').objectStore('keyval').get('profile'); q.onsuccess = () => res(q.result?.prefs) } }))
if (!(saved?.kcalLog?.[0]?.kcal === 2500 && saved.paceGoal === 0.3)) console.log('FAIL calories not saved with the account', saved)
// an old log (last weigh-in 30 days ago): no pace, a hint to weigh in, no estimates card
await p.evaluate(async () => { await new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const tx = r.result.transaction('keyval', 'readwrite'); const W = {}; [[60, 108], [50, 107], [40, 106.4], [30, 106]].forEach(([n, kg]) => W[new Date(Date.now() - n * 864e5).toISOString().slice(0, 10)] = { kg, t: 1 }); tx.objectStore('keyval').put(W, 'weights'); tx.oncomplete = res } }) })
await p.reload(); await p.waitForTimeout(1500)
const v = (await p.locator('.verdict').innerText()).replace(/\s+/g, ' ')
console.log('stale:', v)
if (!/(Dawno bez pomiaru|No weigh-in for a while)/.test(v) || await p.locator('.est').count()) console.log('FAIL stale pace shown as current')
console.log('errs', errs); await b.close()
