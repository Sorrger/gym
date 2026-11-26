// Quiet coach mode: opening an exercise fills in today's suggestion without a pop-up; an old saved 'auto' moves to it once.
import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
import { seed, load } from './seed.mjs'
const b = await launch()
const ctx = await b.newContext({ ...devices['iPhone 15'] }); await ctx.addInitScript(() => localStorage.setItem('onboarded', '1'))
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
await load(p, seed())
// an older account that saved the pop-up mode before the quiet mode existed
await p.evaluate(async () => { await new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const tx = r.result.transaction('keyval', 'readwrite'); const st = tx.objectStore('keyval'); const g = st.get('profile'); g.onsuccess = () => { const pr = g.result || { uid: 'u1', nick: 'T', created: 1, updated: 1, provider: 'local' }; pr.prefs = { ...(pr.prefs || {}), coach: 'auto' }; delete pr.prefs.quietCoach; st.put(pr, 'profile') }; tx.oncomplete = res } }) })
await p.goto('http://localhost:4173/#/plan/0'); await p.reload(); await p.waitForTimeout(1500)
await p.locator('.go:visible').click(); await p.waitForTimeout(900)
const dlg = await p.locator('.dlg:visible').count()
const toast = await p.evaluate(() => [...document.querySelectorAll('ion-toast')].map(t => (t.isOpen ? t.message : '')).filter(Boolean).join(' | ')); const chip = await p.locator('.tip-chip:visible').count()
console.log('dialog on open:', dlg, 'toast:', toast, 'chip:', chip)
if (dlg) console.log('FAIL pop-up shown in quiet mode')
if (!toast.startsWith('Ustawiono')) console.log('FAIL no note about the filled-in suggestion')
// leaving the app and coming back (reload) must not fill it in again or repeat the note
await p.waitForTimeout(3500)
const url = p.url()
await p.locator('.set .step:visible').nth(1).click()
await p.waitForTimeout(400)
const before = await p.evaluate(() => [...document.querySelectorAll('.weight b')].find(e => e.offsetParent)?.textContent)
await p.goto(url); await p.reload(); await p.waitForTimeout(1500)
const toast2 = await p.evaluate(() => [...document.querySelectorAll('ion-toast')].map(t => (t.isOpen ? t.message : '')).filter(Boolean).join(' | '))
const after = await p.evaluate(() => [...document.querySelectorAll('.weight b')].find(e => e.offsetParent)?.textContent)
console.log('after coming back – toast:', JSON.stringify(toast2), 'value', before, '→', after)
if (toast2.startsWith('Ustawiono')) console.log('FAIL note shown again after coming back')
if (before !== after) console.log('FAIL a changed weight was overwritten after coming back')
await p.goto('http://localhost:4173/#/settings/details'); await p.reload(); await p.waitForTimeout(1400)
const on = await p.locator('.seg3 button.on:visible').innerText()
console.log('coach mode in settings:', on)
if (on !== 'Ustawiaj') console.log('FAIL old auto not moved to quiet mode')
// choosing the pop-up again sticks
await p.locator('.seg3 button:visible', { hasText: 'Okienko' }).click(); await p.waitForTimeout(600); await p.reload(); await p.waitForTimeout(1400)
const on2 = await p.locator('.seg3 button.on:visible').innerText(); console.log('after choosing Okienko + reload:', on2)
if (on2 !== 'Okienko') console.log('FAIL pop-up choice not kept')
console.log('errs', errs)
await b.close()
