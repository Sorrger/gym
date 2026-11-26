// shared: seeded realistic data for 3 weeks
export function seed() {
  const now = Date.now(), S = {}
  const day = (n) => new Date(now - n * 864e5)
  const iso = d => d.toISOString().slice(0, 10)
  const mk = (n, d, ex) => { const st = day(n).setHours(18, 0, 0, 0); const id = 's' + n; S[id] = { id, date: iso(day(n)), day: d, ex, started: st, finished: true, updated: st + 55 * 60e3 } }
  const k = (w, rs) => rs.map(r => ({ w, r, d: true }))
  for (const [n, base] of [[15, 0], [8, 2.5], [1, 5]]) {
    mk(n + 3, 0, { 'Wyciskanie sztangi na ławce płaskiej': k(75 + base, [8, 7, 7]), 'Wyciskanie hantli na ławce skośnej': k(22 + base, [10, 9, 9]), 'Rozpiętki na bramie': k(15, [12, 12, 11]), 'Unoszenie hantli bokiem': k(8, [15, 14, 13, 12]), 'Wyciskanie francuskie leżąc': k(25, [10, 9, 8]) })
    mk(n + 2, 1, { 'Nauka podciągania · Wiszenie': [20, 25, 25].map(w => ({ w, d: true })), 'Nauka podciągania · Negatywy': [3, 3, 2].map(w => ({ w, d: true })), 'Wiosłowanie hantlem jednorącz z podparciem': k(26 + base, [10, 10, 9]), 'Wiosłowanie sztangą T (T-bar)': k(40 + base, [9, 9, 8]), 'Face pull na wyciągu': k(20, [15, 15, 14]), 'Unoszenie nóg w podporze na poręczach': [12, 11, 10].map(w => ({ w, d: true })) })
    mk(n + 1, 2, { 'Martwy ciąg rumuński': k(50 + base * 2, [10, 10, 10]), 'Przysiad Zerchera': k(50 + base, [8, 7, 6]), 'Prostowanie nóg na maszynie': k(45, [12, 12, 12]), 'Uginanie nóg na maszynie': k(36, [11, 10, 10]), 'Wspięcia na palce siedząc': k(35, [15, 15, 14, 13]) })
    mk(n, 3, { 'Podciąganie nachwytem (wspomagane)': k(30 - base, [8, 7, 6]), 'Wyciskanie sztangi siedząc z oparciem': k(35 + base, [8, 8, 7]), 'Seal row – wiosłowanie leżąc na ławce': k(30, [10, 9, 9]), 'Rozpiętki na maszynie (butterfly)': k(40, [15, 13, 12]) })
  }
  return S
}
export async function load(p, S) {
  await p.goto('http://localhost:4173/#/tabs/home'); await p.waitForTimeout(1200)
  await putSessions(p, S)
  await p.reload(); await p.waitForTimeout(1500)
}
// replace every stored workout with S (written the old way, as one 'sessions' entry – the app moves it to per-workout entries)
export const putSessions = (p, S) => p.evaluate(S => new Promise(res => {
  const r = indexedDB.open('keyval-store')
  r.onsuccess = () => {
    const tx = r.result.transaction('keyval', 'readwrite'), st = tx.objectStore('keyval')
    const k = st.getAllKeys(); k.onsuccess = () => { k.result.filter(x => String(x).startsWith('s:')).forEach(x => st.delete(x)); st.put(S, 'sessions') }
    tx.oncomplete = res
  }
}), S)
// all stored workouts as { id: workout } (per-workout entries + an old 'sessions' entry not moved yet)
export const getSessions = p => p.evaluate(() => new Promise(res => {
  const r = indexedDB.open('keyval-store')
  r.onsuccess = () => {
    const st = r.result.transaction('keyval').objectStore('keyval'), out = {}
    const c = st.openCursor()
    c.onsuccess = () => {
      const cur = c.result
      if (!cur) return res(out)
      if (String(cur.key).startsWith('s:')) out[cur.value.id] = cur.value
      else if (cur.key === 'sessions') Object.assign(out, cur.value)
      cur.continue()
    }
  }
}))
