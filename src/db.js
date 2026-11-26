// The app's storage on the phone (IndexedDB key → value). Every module reads and writes through here,
// so moving to a separate store per account (or a real database cache) changes only this file.
import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys, getMany as idbGetMany, setMany as idbSetMany, delMany as idbDelMany, clear as idbClear } from 'idb-keyval'

export const get = key => idbGet(key)
export const set = (key, value) => idbSet(key, value)
export const del = key => idbDel(key)
export const keys = () => idbKeys()
export const getMany = list => idbGetMany(list)
export const setMany = entries => idbSetMany(entries)
export const delMany = list => idbDelMany(list)
export const clear = () => idbClear()
