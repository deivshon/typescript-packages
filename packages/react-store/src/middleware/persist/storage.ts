import { StoragePersistence } from "./persist"

export type NamedStorage = {
    type: "named"
    get: (name: string) => Partial<Record<string, unknown>>
    set: (
        name: string,
        value: Partial<Record<string, unknown>>,
        options: Partial<Record<string, Partial<Record<PropertyKey, unknown>>>>,
    ) => void
}

export type GlobalStorage = {
    type: "global"
    get: () => Partial<Record<string, unknown>>
    set: (
        value: Partial<Record<string, unknown>>,
        options: Partial<Record<string, Partial<Record<PropertyKey, unknown>>>>,
    ) => void
    subscribe?: (callback: () => void) => () => void
}

export type Storage = NamedStorage | GlobalStorage

const fromNative = (native: globalThis.Storage): NamedStorage => ({
    type: "named",
    get: (name) => {
        const stored = native.getItem(name)
        if (!stored) {
            return {}
        }

        const parsed: Partial<Record<string, unknown>> = (() => {
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

type UrlStorageOptions = {
    push?: boolean
}

const urlStorage: GlobalStorage = (() => {
    const get: GlobalStorage["get"] = () => {
        try {
            return new URLSearchParams(window.location.search)
                .entries()
                .reduce<Partial<Record<string, unknown>>>((acc, [key, value]) => {
                    acc[key] = value
                    return acc
                }, {})
        } catch {
            return {}
        }
    }

    const set: GlobalStorage["set"] = (value, options) => {
        const url = (() => {
            try {
                return new URL(window.location.href)
            } catch {
                return null
            }
        })()
        if (!url) {
            return
        }

        let replace = true
        for (const key in value) {
            if (typeof key !== "string" || typeof value[key] !== "string") {
                continue
            }

            url.searchParams.set(key, value[key])

            if (!(key in options)) {
                continue
            }

            const fieldOptions = parseUrlStorageOptions(options[key] ?? {})
            if (fieldOptions.push) {
                replace = false
            }
        }

        if (replace) {
            window.history.replaceState({}, "", url)
        } else {
            window.history.pushState({}, "", url)
        }
    }

    const subscribe: GlobalStorage["subscribe"] = (callback) => {
        window.addEventListener("popstate", callback)

        return () => {
            window.removeEventListener("popstate", callback)
        }
    }

    return {
        type: "global",
        get,
        set,
        subscribe,
    }
})()
export const url = (options: UrlStorageOptions = {}): StoragePersistence => ({ storage: urlStorage, options })

const parseUrlStorageOptions = (options: Partial<Record<never, unknown>>): Required<UrlStorageOptions> => ({
    push: "push" in options && typeof options.push === "boolean" ? options.push : false,
})
