// shared by the e2e scripts: browser start (system Chrome if CHROME is set, else Playwright's own Chromium).
// Every new phone (context) skips the first-start screen, unless it is created with { fresh: true }.
import { chromium } from 'playwright-core'
export async function launch() {
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {})
  const newContext = b.newContext.bind(b)
  b.newContext = async ({ fresh, ...opts } = {}) => {
    const c = await newContext(opts)
    if (!fresh) await c.addInitScript(() => { if (!localStorage.getItem('onboarded')) localStorage.setItem('onboarded', '1') })
    return c
  }
  return b
}
