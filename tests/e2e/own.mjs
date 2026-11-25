// Own exercises + renames: renaming an exercise with history asks and moves the history (sets, plan view, other
// trainings) or starts from zero; creating an own exercise in the catalogue, using it, and it stays listed.
import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
import { seed, load } from './seed.mjs'
const b = await launch()
const ctx = await b.newContext({ ...devices['iPhone 15'] })
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + p.url()))
const res = []; const ok = (c, m) => res.push((c ? 'ok   ' : 'FAIL ') + m)
await load(p, seed())
const sessions = () => p.evaluate(() => new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const q = r.result.transaction('keyval').objectStore('keyval').get('sessions'); q.onsuccess = () => res(q.result) } }))
const keys = async () => Object.values(await sessions()).flatMap(s => Object.keys(s.ex || {}))
const dlg = t => p.locator('.dlg-wrap button', { hasText: t })
const RDL = 'Martwy ciąg rumuński', NEW = 'Martwy ciąg rumuński ze sztangą'
const sheet = p.locator('ion-modal.ex-sheet')

// 1) rename with history → move
await p.goto('http://localhost:4173/#/plan/2/edit'); await p.waitForTimeout(1400)
let idx = -1
for (let i = 0; i < await p.locator('input.name').count(); i++) if (await p.locator('input.name').nth(i).inputValue() === RDL) idx = i
ok(idx >= 0, 'RDL row found')
await p.locator('input.name').nth(idx).fill(NEW); await p.locator('input.name').nth(idx).dispatchEvent('change')
await p.locator('button.save').click(); await p.waitForTimeout(500)
ok(await p.locator('.dlg-wrap', { hasText: 'Zmieniłeś nazwę ćwiczenia' }).count() === 1, 'rename with history asks what to do')
await p.screenshot({ path: 'own-rename.png' })
await dlg('Przenieś historię').click(); await p.waitForTimeout(2500)
let k = await keys()
ok(k.includes(NEW) && !k.includes(RDL), 'history moved to the new name in stored workouts')
await p.goto('http://localhost:4173/#/plan/2'); await p.reload(); await p.waitForTimeout(1400)
const txt = await p.locator('ion-content').last().innerText()
ok(txt.includes(NEW) && /ostatnio/i.test(txt), 'plan view shows the new name with its last result')
const plan = await p.evaluate(() => new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const q = r.result.transaction('keyval').objectStore('keyval').get('plan'); q.onsuccess = () => res(q.result) } }))
ok(plan.renamed?.[RDL] === NEW && plan.ids?.[NEW], 'rename + stable id saved with the plan')

// 2) rename → start from zero keeps the old history under the old name
await p.goto('http://localhost:4173/#/plan/2/edit'); await p.reload(); await p.waitForTimeout(1400)
for (let i = 0; i < await p.locator('input.name').count(); i++) if (await p.locator('input.name').nth(i).inputValue() === 'Przysiad Zerchera') idx = i
await p.locator('input.name').nth(idx).fill('Przysiad bułgarski'); await p.locator('input.name').nth(idx).dispatchEvent('change')
await p.locator('button.save').click(); await p.waitForTimeout(500)
await dlg('Nowe ćwiczenie od zera').click(); await p.waitForTimeout(2500)
k = await keys()
ok(k.includes('Przysiad Zerchera') && !k.includes('Przysiad bułgarski'), 'start from zero: old history stays under the old name')

// 3) own exercise: validation, create, use, listed again, not deletable while used
await p.goto('http://localhost:4173/#/plan/0/edit'); await p.reload(); await p.waitForTimeout(1400)
const n0 = await p.locator('.card.ex').count()
await p.locator('button.add').click(); await p.waitForTimeout(800)
await sheet.locator('.ep-new').click(); await p.waitForTimeout(300)
await sheet.locator('.mk-in').fill('Mój wynalazek')
await sheet.locator('.ep-pick').click(); await p.waitForTimeout(200)
ok(/główny mięsień/.test(await sheet.locator('.mk-err').textContent()), 'own exercise needs a main muscle')
await sheet.locator('.mk-in').fill('Wyciskanie sztangi na ławce płaskiej'); await sheet.locator('.mchip', { hasText: 'Klatka' }).click()
await sheet.locator('.ep-pick').click(); await p.waitForTimeout(200)
ok(/katalogu/.test(await sheet.locator('.mk-err').textContent()), 'a catalogue name is refused')
await sheet.locator('.mk-in').fill('Mój wynalazek'); await sheet.locator('.ochip', { hasText: 'Powtórzenia' }).click()
await sheet.locator('.mchip', { hasText: 'Triceps' }).click(); await sheet.locator('.mchip', { hasText: 'Triceps' }).click()
await p.screenshot({ path: 'own-make.png' })
await sheet.locator('.ep-pick').click(); await p.waitForTimeout(800)
const last = p.locator('.card.ex').nth(n0)
ok(await last.locator('input.name').inputValue() === 'Mój wynalazek', 'created exercise fills the row')
ok(/Klatka/.test(await last.locator('.mus b').textContent()) && await last.locator('.seg button.on').textContent() === 'Powtórzenia', 'row gets the own muscles and unit')
await p.locator('button.save').click(); await p.waitForTimeout(2500)
await p.goto('http://localhost:4173/#/plan/0/edit'); await p.reload(); await p.waitForTimeout(1400)
await p.locator('button.add').click(); await p.waitForTimeout(800)
ok(await sheet.locator('.ep-row.own', { hasText: 'Mój wynalazek' }).count() === 1, 'own exercise is listed under Moje ćwiczenia')
ok(await sheet.locator('.ep-row.own .own-del').count() === 0, 'an own exercise used in the plan cannot be deleted')
await sheet.locator('.ep-search').fill('wynalaz'); await p.waitForTimeout(200)
ok(await sheet.locator('.ep-row.own').count() === 1, 'search finds own exercises')
await sheet.locator('.ep-x').click(); await p.waitForTimeout(500)
// it works in a workout: the Push plan preview lists it
await p.goto('http://localhost:4173/#/plan/0'); await p.reload(); await p.waitForTimeout(1400)
ok((await p.locator('ion-content').last().innerText()).includes('Mój wynalazek'), 'own exercise shows in the plan preview')
ok(!errs.length, 'no page errors ' + errs.join(' | '))
console.log(res.join('\n')); await b.close()
if (res.some(r => r.startsWith('FAIL'))) process.exit(1)
