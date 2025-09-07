import { SyncNamedStorage, SyncNamedStorageInstance } from "./storage"
import { valueFromStorage } from "./utils"

const fromWebStorage = (native: globalThis.Storage): SyncNamedStorage => ({
    async: false,
    type: "named",
    get: (name) => {
        const stored = native.getItem(name)

        let parsed: unknown
        try {
            parsed = stored ? JSON.parse(stored) : {}
        } catch {
            parsed = {}
        }

        return valueFromStorage(parsed)
    },
    set: (name, value) => {
        try {
            const stringified = JSON.stringify(value)
            native.setItem(name, stringified)
        } catch {
            return
        }
    },
})

const $local: SyncNamedStorage = fromWebStorage(localStorage)
export const local = (): SyncNamedStorageInstance => ({
    storage: $local,
    options: {},
})

const $session: SyncNamedStorage = fromWebStorage(sessionStorage)
export const session = (): SyncNamedStorageInstance => ({
    storage: $session,
    options: {},
})
