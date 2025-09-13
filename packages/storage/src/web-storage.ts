import { SyncNamedStorage, SyncNamedStorageInstance } from "./storage"
import { valueFromStorage } from "./utils"

const fromWebStorage = (native: globalThis.Storage): SyncNamedStorage => {
    const get: SyncNamedStorage["get"] = (name) => {
        const stored = native.getItem(name)

        let parsed: unknown
        try {
            parsed = stored ? JSON.parse(stored) : {}
        } catch {
            parsed = {}
        }

        return valueFromStorage(parsed)
    }
    const replace: SyncNamedStorage["replace"] = (name, value) => {
        try {
            const stringified = JSON.stringify(value)
            native.setItem(name, stringified)
        } catch {
            return
        }
    }
    const update: SyncNamedStorage["update"] = (name, value, options) => {
        const current = get(name)
        const updated = { ...current, ...value }
        replace(name, updated, options)
    }

    return {
        async: false,
        type: "named",
        get,
        replace,
        update,
    }
}

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
