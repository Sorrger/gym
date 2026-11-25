// Logic tests (coach, store, stats, prefs) in plain node: bundle src with esbuild, stub IndexedDB and Vue's runtime.
// Run: npm test
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const here = path.dirname(fileURLToPath(import.meta.url))
const r = p => path.join(here, p)
execSync(`npx esbuild ${r('entry.mjs')} --bundle --format=esm --platform=node --inject:${r('shim.mjs')} --alias:idb-keyval=${r('idb.mjs')} --alias:vue=${r('vue.mjs')} --outfile=${r('b.mjs')} --log-level=error`, { stdio: 'inherit' })
await import('./t.mjs')
