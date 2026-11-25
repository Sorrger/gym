// One place for "files in the cloud" (today: files in the user's secret GitHub Gist via cloud.js).
// weight.js, customPlan.js, account.js and strava.js only use these functions – when the app moves to its own
// database + sign-in, only this file (and cloud.js's main backup) changes. See CLAUDE.md "Accounts + own database".
import { watch } from 'vue'
import { cloud, readGistFile, writeGistFile } from './cloud'

export const backend = 'github-gist'
// connected and online → reads/writes can go out now
export const canSync = () => !!(cloud.token && cloud.gistId && navigator.onLine)
export const hasBackend = () => !!cloud.token
export const readFile = name => readGistFile(name)
export const writeFile = (name, data) => writeGistFile(name, data)
// run fn whenever a (new) cloud connection appears, e.g. right after connecting on a new phone
export const onConnected = fn => watch(() => cloud.gistId, id => { if (id) fn() })
export const cloudLoaded = () => cloud.loaded
