// Rescue screen: a plain script (no app code, no libraries), loaded before the app. If the app doesn't start
// (a broken update, a file that failed to load, an error during start) it offers: try again, repair (drop the
// cached app files – workouts stay), and save a copy of all data as a file the app can import later.
// The app sets window.__appReady = true once it is on screen.
(function () {
  'use strict'
  var en = false
  try { en = localStorage.getItem('lang') === 'en' } catch (e) { /* private mode */ }
  var T = en
    ? { title: 'The app did not start', text: 'Your workouts are safe on this phone. Try again first. If that does not help, repair the app – it downloads the app files again, your data stays.',
      again: 'Try again', repair: 'Repair the app', save: 'Save a copy of my data', saving: 'Saving…', saved: 'Copy saved', none: 'No data on this phone', err: 'Details: ' }
    : { title: 'Apka się nie uruchomiła', text: 'Twoje treningi są bezpieczne w telefonie. Najpierw spróbuj ponownie. Jeśli nie pomoże – napraw apkę: pobierze swoje pliki od nowa, dane zostają.',
      again: 'Spróbuj ponownie', repair: 'Napraw apkę', save: 'Zapisz kopię moich danych', saving: 'Zapisywanie…', saved: 'Kopia zapisana', none: 'Brak danych w telefonie', err: 'Szczegóły: ' }
  var lastErr = ''
  var shown = false

  function ready() { return !!window.__appReady }
  function updating() { return !!document.getElementById('upd') }

  function onError(msg) {
    if (ready()) return
    lastErr = String(msg || '').slice(0, 200)
    // give the app a moment: some errors during start are harmless
    setTimeout(function () { if (!ready() && !updating()) show() }, 4000)
  }
  window.addEventListener('error', function (e) {
    var t = e.target
    if (t && t !== window && (t.tagName === 'SCRIPT' || t.tagName === 'LINK')) onError('load failed: ' + (t.src || t.href))
    else onError(e.message || (e.error && e.error.message))
  }, true)
  window.addEventListener('unhandledrejection', function (e) { onError(e.reason && (e.reason.message || e.reason)) })

  // watchdog: not on screen after 15 s (an update may take longer – wait for it)
  function watch(ms) { setTimeout(function () { if (ready()) return; if (updating()) return watch(15000); show() }, ms) }
  watch(15000)

  function btn(label, primary, fn) {
    var b = document.createElement('button')
    b.textContent = label
    b.style.cssText = 'display:block;width:100%;margin-top:10px;padding:15px;border:0;border-radius:14px;font:600 17px -apple-system,system-ui,sans-serif;' +
      (primary ? 'background:#5a2be0;color:#fff' : 'background:rgba(120,120,128,.18);color:inherit')
    b.onclick = fn
    return b
  }
  function show() {
    if (shown || ready()) return
    shown = true
    var dark = document.documentElement.classList.contains('ion-palette-dark') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches)
    var box = document.createElement('div')
    box.id = 'rescue'
    box.setAttribute('role', 'alertdialog')
    box.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:24px;' +
      'font:16px/1.45 -apple-system,system-ui,sans-serif;background:' + (dark ? '#000;color:#fff' : '#f2f2f7;color:#000')
    var card = document.createElement('div')
    card.style.cssText = 'max-width:420px;width:100%'
    var h = document.createElement('h1'); h.textContent = T.title; h.style.cssText = 'font-size:26px;margin:0 0 8px'
    var p = document.createElement('p'); p.textContent = T.text; p.style.cssText = 'margin:0 0 14px;opacity:.75'
    var note = document.createElement('p'); note.style.cssText = 'margin:12px 0 0;font-size:13px;opacity:.6;word-break:break-word'
    if (lastErr) note.textContent = T.err + lastErr
    card.appendChild(h); card.appendChild(p)
    card.appendChild(btn(T.again, true, function () { location.reload() }))
    card.appendChild(btn(T.repair, false, repair))
    var save = btn(T.save, false, function () { saveCopy(save) })
    card.appendChild(save)
    card.appendChild(note)
    box.appendChild(card)
    document.body.appendChild(box)
  }

  // drop the service worker and its cached files, then load fresh from the network; IndexedDB / localStorage stay
  function repair() {
    var jobs = []
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister() })) }))
    }
    if (window.caches && caches.keys) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k) })) }))
    Promise.all(jobs).catch(function () {}).then(function () { location.replace(location.pathname + '?fresh=' + Date.now() + location.hash) })
  }

  // every entry of the app's IndexedDB → the same JSON as Ustawienia → Kopia → "Zapisz do pliku" (importable)
  function readAll() {
    return new Promise(function (res, rej) {
      var open = indexedDB.open('keyval-store')
      open.onerror = function () { rej(open.error) }
      open.onupgradeneeded = function () { open.result.createObjectStore('keyval') }
      open.onsuccess = function () {
        var db = open.result, out = {}
        var tx = db.transaction('keyval', 'readonly'), st = tx.objectStore('keyval'), cur = st.openCursor()
        cur.onsuccess = function () { var c = cur.result; if (c) { out[c.key] = c.value; c.continue() } }
        tx.oncomplete = function () { res(out) }
        tx.onerror = function () { rej(tx.error) }
      }
    })
  }
  function saveCopy(b) {
    b.textContent = T.saving
    readAll().then(function (all) {
      var sessions = {}
      Object.keys(all).forEach(function (k) { if (k.indexOf('s:') === 0 && all[k] && all[k].id) sessions[all[k].id] = all[k] })
      var legacy = all.sessions || all['sessions-v1'] || {}
      Object.keys(legacy).forEach(function (id) { if (!sessions[id]) sessions[id] = legacy[id] })
      if (!Object.keys(all).length) { b.textContent = T.none; return }
      var data = { app: 'silownia', v: 2, exported: new Date().toISOString(), rescue: true, sessions: sessions, deleted: all.deleted || {},
        weights: all.weights || {}, measures: all.measures || {}, plan: all.plan || null, profile: all.profile || null }
      var json = JSON.stringify(data)
      var name = 'inchup-ratunek-' + new Date().toISOString().slice(0, 10) + '.json'
      var done = function () { b.textContent = T.saved }
      try {
        var f = new File([json], name, { type: 'application/json' })
        if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).then(done, function () { b.textContent = T.save }); return }
      } catch (e) { /* fall back to a download */ }
      var a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      a.download = name; document.body.appendChild(a); a.click(); a.remove(); done()
    }).catch(function (e) { b.textContent = T.save; lastErr = String(e && e.message || e) })
  }
  window.__rescue = { show: show, repair: repair, readAll: readAll }
})()
