// Logic tests (coach, store, stats, prefs, weight, records, English) in plain node:
// bundle src with esbuild, stub IndexedDB and Vue's runtime. Run: npm test
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const here = path.dirname(fileURLToPath(import.meta.url))
const r = p => path.join(here, p)
execSync(`npx esbuild ${r('entry.mjs')} --bundle --format=esm --platform=node --inject:${r('shim.mjs')} --alias:idb-keyval=${r('idb.mjs')} --alias:vue=${r('vue.mjs')} --outfile=${r('b.mjs')} --log-level=error`, { stdio: 'inherit' })
await import('./t.mjs')
await import('./t2.mjs')
await import('./t3.mjs')
await import('./t4.mjs')
const { T1, T2, T3, T4 } = globalThis
const n = T1.n + T2.n + T3.n + T4.n, fails = T1.fails + T2.fails + T3.fails + T4.fails
console.log(`\n${n - fails}/${n} passed`)
process.exitCode = fails ? 1 : 0
