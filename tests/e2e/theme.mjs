import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
const b = await launch()
const p = await (await b.newContext({ ...devices['iPhone 15'], colorScheme: 'light' })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
await p.goto('http://localhost:4173/#/settings/look'); await p.waitForTimeout(1500)
const st = () => p.evaluate(() => ({ dark: document.documentElement.classList.contains('ion-palette-dark'), accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(), bg: getComputedStyle(document.body).backgroundColor }))
console.log('start', await st())
await p.locator('.seg3 button', { hasText: 'Ciemny' }).click(); await p.locator('.sw button[aria-label="Zielony"]').click(); await p.waitForTimeout(300)
console.log('dark+green', await st())
await p.reload(); await p.waitForTimeout(1500); console.log('after reload', await st())
await p.goto('http://localhost:4173/#/tabs/train'); await p.waitForTimeout(1200); await p.screenshot({ path: 'th1.png' })
await p.goto('http://localhost:4173/#/settings/look'); await p.waitForTimeout(800)
await p.locator('.seg3 button', { hasText: 'Jak telefon' }).click(); await p.locator('.sw button[aria-label="Fiolet"]').click(); await p.waitForTimeout(300)
console.log('back to system', await st())
// weight subpage back
await p.goto('http://localhost:4173/#/tabs/progress'); await p.waitForTimeout(900); await p.locator('.ptabs button', { hasText: 'Ciało' }).click(); await p.waitForTimeout(300); await p.locator('.wcard:visible').click(); await p.waitForTimeout(1200); console.log('weight url', p.url().split('#')[1])
await p.locator('.back:visible').click(); await p.waitForTimeout(1200); console.log('back url', p.url().split('#')[1])
// old links
await p.goto('http://localhost:4173/#/tabs/settings'); await p.waitForTimeout(1200); console.log('settings →', p.url().split('#')[1])
await p.goto('http://localhost:4173/#/tabs/plans'); await p.waitForTimeout(1200); console.log('plans →', p.url().split('#')[1])
// background styles + tab banners
const cssVar = v => p.evaluate(v => getComputedStyle(document.documentElement).getPropertyValue(v).trim(), v)
await p.goto('http://localhost:4173/#/settings/look'); await p.waitForTimeout(900)
await p.locator('.seg3 button', { hasText: 'Ciemny' }).click(); await p.waitForTimeout(200)
for (const name of ['Kolorowy', 'Grafit', 'Kontrast', 'Klasyczny']) { await p.locator('.st', { hasText: name }).click(); await p.waitForTimeout(200); console.log('style', name, await cssVar('--app-bg') || 'default') }
await p.locator('.st', { hasText: 'Kolorowy' }).click(); await p.reload(); await p.waitForTimeout(1300)
const bg1 = await cssVar('--app-bg'); console.log(bg1 && bg1 !== '#000000' ? 'style kept after reload ' + bg1 : 'FAIL tinted style lost after reload')
for (const t of ['train', 'history', 'profile']) { await p.goto('http://localhost:4173/#/tabs/' + t); await p.waitForTimeout(1000); const n = await p.locator('.tab-banner:visible').count(); if (!n) console.log('FAIL no banner on', t); else console.log('banner on', t) }
await p.goto('http://localhost:4173/#/tabs/train'); await p.waitForTimeout(800)
console.log('week chips', (await p.locator('.wk-chip:visible').allTextContents()).join(', '))
await p.goto('http://localhost:4173/#/settings/look'); await p.waitForTimeout(800)
await p.locator('.st', { hasText: 'Klasyczny' }).click(); await p.locator('.seg3 button', { hasText: 'Jak telefon' }).click()
console.log('errors', errs); await b.close()
