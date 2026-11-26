import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
import { seed, load } from './seed.mjs'
const b = await launch()
const U = 'http://localhost:4173/#'
for (const mode of ['light', 'dark']) {
  const ctx = await b.newContext({ ...devices['iPhone 15'] })
  await ctx.addInitScript(m => localStorage.setItem('look', JSON.stringify({ mode: m })), mode)
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @' + p.url().split('#')[1]))
  await load(p, seed())
  const where = async () => { await p.waitForTimeout(900); const h = await p.evaluate(() => { const v = [...document.querySelectorAll('h1, ion-title, .t-large')].filter(e => e.offsetParent && e.getBoundingClientRect().width > 0).map(e => e.textContent.trim()); return v[0] || '' }); const tab = await p.evaluate(() => { const e = [...document.querySelectorAll('ion-tab-button.tab-selected')].find(x => x.offsetParent); return e ? e.id : '-' }); return p.url().split('#')[1] + ' | ' + h.slice(0, 30) + ' | tab=' + tab }
  const log = async l => console.log(mode, l.padEnd(26), await where())
  for (const t of ['progress', 'train', 'history', 'profile', 'home']) { await p.locator(t === "train" ? "ion-tab-button.center" : `#tab-button-${t}`).click(); await log('tab ' + t) }
  await p.locator('.banner').click(); await log('banner → plan preview')
  await p.locator('button.rb[aria-label="Wróć"]:visible').first().click(); await log('back')
  await p.locator('ion-tab-button.center').click(); await p.waitForTimeout(500)
  await p.locator('.row:visible', { hasText: 'Edytuj plan' }).click(); await log('Edytuj plan')
  await p.locator('.back:visible, ion-back-button:visible').first().click(); await log('back')
  await p.locator('#tab-button-profile').click(); await p.waitForTimeout(400)
  await p.locator('.row:visible', { hasText: 'Ustawienia' }).first().click(); await log('Ustawienia')
  await p.locator('.back:visible').first().click(); await log('back')
  await p.locator('#tab-button-progress').click(); await p.waitForTimeout(400)
  await p.locator('.ptabs button', { hasText: 'Treningi' }).click(); await p.waitForTimeout(300)
  await p.locator('.pcard:visible').first().click(); await log('plan progress')
  await p.locator('ion-back-button:visible').first().click(); await log('back')
  console.log(mode, 'ptab kept:', await p.locator('.ptabs button.on').textContent())
  await p.locator('.ptabs button', { hasText: 'Ciało' }).click(); await p.waitForTimeout(300)
  await p.locator('.wcard:visible').click(); await log('weight from Ciało')
  await p.locator('.back:visible').first().click(); await log('back')
  await p.locator('#tab-button-history').click(); await p.waitForTimeout(500)
  const row = p.locator('.hrow:visible, .ios-group .row:visible, ion-item:visible').first(); if (await row.count()) { await row.click(); await log('session') ; await p.locator('.rb:visible').first().click(); await log('back') }
  await p.locator('#tab-button-home').click(); await p.waitForTimeout(400)
  await p.locator('.banner:visible').click(); await log('plan preview'); await p.locator('.rb:visible, ion-back-button:visible').first().click(); await log('back')
  for (const r of ['/tabs/train', '/plans', '/weight', '/tabs/settings', '/tabs/weight', '/tabs/plans', '/nonsense', '/tabs/xyz', '/plan/1', '/progress/2']) { await p.goto(U + r); await p.reload(); await p.waitForTimeout(800); await log('deep ' + r) }
  console.log(mode, 'errors', errs); await ctx.close()
}
await b.close()
