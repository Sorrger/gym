globalThis.document = { addEventListener() {}, visibilityState: 'visible' }
globalThis.window = { addEventListener() {} }
export * as store from '../../src/store.js'
export * as plan from '../../src/plan.js'
export * as coach from '../../src/coach.js'
export * as stats from '../../src/stats.js'
export * as prefsM from '../../src/prefs.js'
