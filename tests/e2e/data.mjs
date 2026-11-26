// Storage per workout (old single entry moved), CSV export + import (own / Strong), "Usuń wszystkie moje dane".
import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
import { seed, load, getSessions } from './seed.mjs'
import fs from 'node:fs'
const b = await launch()
const ctx = await b.newContext({ ...devices['iPhone 15'], acceptDownloads: true }); await ctx.addInitScript(() => localStorage.setItem('onboarded', '1'))
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
const S = seed(); await load(p, S)
const ok = (c, m) => console.log((c ? 'ok   ' : 'FAIL ') + m)
const keys = () => p.evaluate(() => new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const q = r.result.transaction('keyval').objectStore('keyval').getAllKeys(); q.onsuccess = () => res(q.result.map(String)) } }))
let k = await keys()
ok(k.filter(x => x.startsWith('s:')).length === Object.keys(S).length && !k.includes('sessions') && k.includes('sessions-v1'), 'old single entry moved to one entry per workout (copy kept): ' + k.length)
// one change rewrites one workout
await p.goto('http://localhost:4173/#/plan/0'); await p.reload(); await p.waitForTimeout(1500)
await p.locator('.go:visible').click(); await p.waitForTimeout(1500)
await p.locator('.dlg-btn:visible').last().click().catch(() => {})
await p.locator('button.check:visible').first().click(); await p.waitForTimeout(600)
const all = await getSessions(p)
ok(Object.keys(all).length === Object.keys(S).length + 1 && Object.values(all).some(s => !s.finished && Object.values(s.ex).flat().some(x => x.d)), 'a ticked set is saved in its own workout entry')
ok(Object.values(all).every(s => Object.keys(s.ex).every(x => s.xid?.[x])), 'every stored exercise carries a stable id')
await p.locator('.tb-finish:visible').click(); await p.waitForTimeout(1000); await p.locator('.save-btn').click(); await p.waitForTimeout(1000)

// CSV export
await p.goto('http://localhost:4173/#/settings/backup'); await p.reload(); await p.waitForTimeout(1500)
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.locator('button.row', { hasText: 'Zapisz serie jako CSV' }).click()])
let csv = ''
if (dl) { csv = Buffer.concat(await (await dl.createReadStream()).toArray()).toString(); ok(csv.split('\n')[0].includes('Exercise id') && csv.split('\n').length > 40, 'CSV export: header + one row per set (' + csv.split('\n').length + ' lines)') } else ok(false, 'CSV export: no download')

// CSV import on a fresh phone: our file and a Strong file
const p2 = await (await b.newContext({ ...devices['iPhone 15'] })).newPage(); p2.on('pageerror', e => errs.push(e.message))
await p2.addInitScript(() => localStorage.setItem('onboarded', '1'))
await p2.goto('http://localhost:4173/#/settings/backup'); await p2.waitForTimeout(1500); await p2.reload(); await p2.waitForTimeout(1500)
fs.writeFileSync('/tmp/own.csv', csv)
await p2.locator('input[type=file][accept*=csv]').setInputFiles('/tmp/own.csv'); await p2.waitForTimeout(1200)
const title = await p2.locator('.dlg:visible').innerText().catch(() => '')
ok(/Wczytać \d+ treningów/.test(title), 'CSV import asks first: ' + title.split('\n')[0])
await p2.locator('.dlg-btn:visible', { hasText: 'Wczytaj' }).click(); await p2.waitForTimeout(1200)
const got = await getSessions(p2)
ok(Object.keys(got).length === Object.keys(S).length + 1, 'CSV import: all workouts are back (' + Object.keys(got).length + ')')
fs.writeFileSync('/tmp/strong.csv', 'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE\n2026-10-01 18:00:00,Push,1h,Bench Press (Barbell),1,80,8,0,0,,,\n')
await p2.locator('input[type=file][accept*=csv]').setInputFiles('/tmp/strong.csv'); await p2.waitForTimeout(1200)
await p2.locator('.dlg-btn:visible', { hasText: 'Wczytaj' }).click(); await p2.waitForTimeout(1200)
ok(Object.keys(await getSessions(p2)).length === Object.keys(S).length + 2, 'Strong CSV import adds its workout')

// delete everything
await p.goto('http://localhost:4173/#/settings/backup'); await p.reload(); await p.waitForTimeout(1500)
await p.locator('button.row', { hasText: 'Usuń wszystkie moje dane' }).click(); await p.waitForTimeout(600)
await p.locator('.dlg-btn:visible', { hasText: 'Usuń bez kopii' }).click(); await p.waitForTimeout(600)
await p.locator('.dlg-btn:visible', { hasText: 'Usuń wszystko' }).click(); await p.waitForTimeout(2500)
k = await keys()
ok(!k.some(x => x.startsWith('s:')) && !k.includes('sessions-v1'), 'wipe: no workouts left on the phone (' + k.join(',') + ')')
ok(!k.some(x => ['weights', 'plan', 'deleted', 'cloud'].includes(x)), 'wipe: weights, plan, backup link gone (left: ' + k.join(',') + ')') // (this test keeps localStorage.onboarded, so no welcome screen here)
console.log('errs', errs)
await b.close()
