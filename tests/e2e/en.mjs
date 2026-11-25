import { chromium, devices } from 'playwright-core'
import { seed, load } from './seed.mjs'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const ctx = await b.newContext({ ...devices['iPhone 15'] }); await ctx.addInitScript(() => { localStorage.setItem('lang', 'en') })
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
await load(p, seed())
for (const h of ['/tabs/home', '/tabs/progress', '/plan/1', '/settings']) { await p.goto('http://localhost:4173/#' + h); await p.reload(); await p.waitForTimeout(1300); console.log(h, (await p.locator('ion-content:visible').first().innerText()).replace(/\s+/g, ' ').slice(0, 220)) }
await p.locator('.go:visible').count()
const c2 = await b.newContext({ ...devices['iPhone 15'] }); const q = await c2.newPage(); q.on('pageerror', e => errs.push(e.message))
await q.goto('http://localhost:4173/#/tabs/home'); await q.waitForTimeout(1500); console.log('fresh →', q.url().split('#')[1])
console.log('errs', errs); await b.close()
