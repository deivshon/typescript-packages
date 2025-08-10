import { StoragePersistence } from "../persist"
import { NamedStorage } from "./storage"

const fromNative = (native: globalThis.Storage): NamedStorage => ({
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

const $localStorage: NamedStorage = fromNative(localStorage)
export const local = (): StoragePersistence => ({
    storage: $localStorage,
    options: {},
})

const $sessionStorage: NamedStorage = fromNative(sessionStorage)
export const session = (): StoragePersistence => ({
    storage: $sessionStorage,
    options: {},
})
