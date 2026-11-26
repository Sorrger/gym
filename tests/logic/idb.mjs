// in-memory stand-in for idb-keyval (logic tests)
export const mem = new Map()
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))
export const get = async k => clone(mem.get(k))
export const set = async (k, v) => { mem.set(k, clone(v)) }
export const del = async k => { mem.delete(k) }
export const keys = async () => [...mem.keys()]
export const getMany = async ks => ks.map(k => clone(mem.get(k)))
export const setMany = async es => { for (const [k, v] of es) mem.set(k, clone(v)) }
export const delMany = async ks => { for (const k of ks) mem.delete(k) }
export const clear = async () => { mem.clear() }
