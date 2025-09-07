import { NamedStorage, SyncNamedStorage, SyncNamedStorageInstance } from "./storage"

const fromNative = (native: globalThis.Storage): SyncNamedStorage => ({
    async: false,
    type: "named",
    get: (name) => {
        const stored = native.getItem(name)
        if (!stored) {
            return {}
        }

        const parsed: Partial<Record<string, string>> = (() => {
            try {
                const raw: unknown = JSON.parse(stored)
                if (typeof raw !== "object" || !raw) {
                    return {}
                }

                return raw
            } catch {
                return {}
            }
        })()

        return parsed
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

const $local: NamedStorage = fromNative(localStorage)
export const local = (): SyncNamedStorageInstance => ({
    storage: $local,
    options: {},
})

const $session: NamedStorage = fromNative(sessionStorage)
export const session = (): SyncNamedStorageInstance => ({
    storage: $session,
    options: {},
})
