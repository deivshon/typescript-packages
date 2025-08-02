export type NamedStorage = {
    type: "named"
    get: (name: string) => Partial<Record<string, unknown>>
    set: (name: string, value: Partial<Record<string, unknown>>) => void
}

export type GlobalStorage = {
    type: "global"
    get: () => Partial<Record<string, unknown>>
    set: (value: Partial<Record<string, unknown>>) => void
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

export const local: NamedStorage = fromNative(localStorage)
export const session: NamedStorage = fromNative(sessionStorage)

export const url: GlobalStorage = (() => {
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

    const set: GlobalStorage["set"] = (value) => {
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
