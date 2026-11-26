// The app never stays stuck: when its start file can't load, the rescue screen shows up, saves an importable copy
// of all data and repairs the app (fresh files, data kept). A normal start never shows it.
import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
import { seed, load } from './seed.mjs'
import fs from 'node:fs'
const b = await launch()
let fails = 0
const ok = (c, m, x) => { if (!c) { fails++; console.log('FAIL', m, x ?? '') } else console.log('ok  ', m) }
const U = 'http://localhost:4173/'

// 1) normal start: ready, no rescue, even after the watchdog time
{
  const ctx = await b.newContext({ ...devices['iPhone 15'] }); const p = await ctx.newPage()
  await load(p, seed()); await p.waitForTimeout(16500)
  ok(await p.evaluate(() => window.__appReady === true) && !(await p.locator('#rescue').count()), 'normal start: app ready, no rescue screen')
  await ctx.close()
}
// 2) broken start file
{
  const ctx = await b.newContext({ ...devices['iPhone 15'], acceptDownloads: true, serviceWorkers: 'block' }); const p = await ctx.newPage()
  // data on the phone first (same origin, without starting the app)
  await p.goto(U + 'rescue.js')
  await p.evaluate(() => new Promise(res => { const r = indexedDB.open('keyval-store'); r.onupgradeneeded = () => r.result.createObjectStore('keyval'); r.onsuccess = () => { const tx = r.result.transaction('keyval', 'readwrite'); const st = tx.objectStore('keyval')
    st.put({ id: 'w1', date: '2026-11-20', day: 0, ex: { 'Wyciskanie sztangi na ławce płaskiej': [{ w: 80, r: 8, d: true }] }, started: 1, finished: true, updated: 1 }, 's:w1')
    st.put({ '2026-11-20': { kg: 90, t: 1 } }, 'weights'); tx.oncomplete = res } }))
  await p.route(/assets\/index-.*\.js$/, r => r.abort())
  await p.goto(U); await p.waitForTimeout(6000)
  ok(await p.locator('#rescue').count() === 1, 'broken start file → rescue screen')
  ok((await p.locator('#rescue').innerText()).includes('Twoje treningi są bezpieczne'), 'rescue text')
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.locator('#rescue button', { hasText: 'Zapisz kopię' }).click()])
  let data = null
  if (dl) { const f = await dl.path(); data = JSON.parse(fs.readFileSync(f, 'utf8')) }
  ok(data && data.app === 'silownia' && data.sessions?.w1?.ex && data.weights?.['2026-11-20']?.kg === 90, 'copy of all data saved (importable format)', data && Object.keys(data))
  await p.unroute(/assets\/index-.*\.js$/)
  await p.locator('#rescue button', { hasText: 'Napraw' }).click()
  await p.waitForTimeout(3500)
  ok(await p.evaluate(() => window.__appReady === true) && !(await p.locator('#rescue').count()), 'repair → app starts again')
  const kept = await p.evaluate(() => new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const q = r.result.transaction('keyval').objectStore('keyval').get('s:w1'); q.onsuccess = () => res(q.result) } }))
  ok(kept?.ex, 'data kept after repair')
  await ctx.close()
}
// 3) rescue in English
{
  const ctx = await b.newContext({ ...devices['iPhone 15'], serviceWorkers: 'block' }); const p = await ctx.newPage()
  await p.addInitScript(() => localStorage.setItem('lang', 'en'))
  await p.route(/assets\/index-.*\.js$/, r => r.abort())
  await p.goto(U); await p.waitForTimeout(6000)
  ok((await p.locator('#rescue').innerText().catch(() => '')).includes('The app did not start'), 'rescue in English')
  await ctx.close()
}
await b.close()
if (fails) { console.log(fails + ' FAILED'); process.exit(1) }
