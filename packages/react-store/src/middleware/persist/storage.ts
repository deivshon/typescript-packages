export type Storage = {
    id: symbol
    get: (name: string) => Partial<Record<PropertyKey, unknown>> | null
    set: (name: string, value: Partial<Record<PropertyKey, unknown>>) => void
    subscribe?: (name: string, callback: () => void) => () => void
}

const fromNative = (native: globalThis.Storage): Storage => ({
    id: Symbol(),
    get: (name) => {
        const stored = native.getItem(name)
        if (!stored) {
            return null
        }

        const parsed: Partial<Record<PropertyKey, unknown>> | null = (() => {
            try {
                const raw: unknown = JSON.parse(stored)
                if (typeof raw !== "object" || !raw) {
                    return null
                }

                return raw
            } catch {
                return null
            }
        })()

        return parsed
    },
    set: (name, value) => {
        const stringified = (() => {
            try {
                return JSON.stringify(value)
            } catch {
                return null
            }
        })()
        if (typeof stringified !== "string") {
            return
        }

        native.setItem(name, stringified)
    },
})

export const local: Storage = fromNative(localStorage)
export const session: Storage = fromNative(sessionStorage)

export const url: Storage = (() => {
    const get: Storage["get"] = () => {
        try {
            return new URLSearchParams(window.location.search)
                .entries()
                .reduce<Partial<Record<PropertyKey, unknown>>>((acc, [key, value]) => {
                    acc[key] = value
                    return acc
                }, {})
        } catch {
            return {}
        }
    }

    const set: Storage["set"] = (_, value) => {
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

        for (const key in value) {
            if (typeof key !== "string" || typeof value[key] !== "string") {
                continue
            }

            url.searchParams.set(key, value[key])
        }

        window.history.pushState({}, "", url)
    }

    const subscribe: Storage["subscribe"] = (_, callback) => {
        window.addEventListener("popstate", callback)

        return () => {
            window.removeEventListener("popstate", callback)
        }
    }

    return {
        id: Symbol(),
        get,
        set,
        subscribe,
    }
})()
