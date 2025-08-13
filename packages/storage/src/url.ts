import { GlobalStorage } from "./storage"

type UrlStateControls = {
    get: () => Array<[string, string]>
    set: (
        entries: Array<[string, string]>,
        opts: {
            replace: boolean
        },
    ) => void
}

let urlStateControls: UrlStateControls | null = null
export const setUrlStorageControls = (controls: UrlStateControls | null) => {
    urlStateControls = controls
}

const sync = (() => {
    const listeners = new Set<() => void>()

    const dispatch = () => {
        for (const listener of listeners) {
            listener()
        }
    }

    const listen = (callback: () => void) => {
        listeners.add(callback)

        return () => {
            listeners.delete(callback)
        }
    }

    return {
        dispatch,
        listen,
    }
})()
export const syncUrlStorage = sync.dispatch

export type UrlStorageOptions = {
    push?: boolean
}

const parseUrlStorageOptions = (options: Partial<Record<never, unknown>>): Required<UrlStorageOptions> => ({
    push: "push" in options && typeof options.push === "boolean" ? options.push : false,
})

export const url: GlobalStorage = (() => {
    const get: GlobalStorage["get"] = () => {
        const entries = urlStateControls
            ? urlStateControls.get()
            : Array.from(new URLSearchParams(window.location.search))

        return entries.reduce<Partial<Record<string, string>>>((acc, [key, value]) => {
            acc[key] = value
            return acc
        }, {})
    }

    const set: GlobalStorage["set"] = (value, options) => {
        if (!urlStateControls) {
            return
        }

        const current = get()

        let replace = true
        for (const key in value) {
            if (typeof key !== "string" || typeof value[key] !== "string") {
                continue
            }

            current[key] = value[key]

            if (!(key in options)) {
                continue
            }

            const fieldOptions = parseUrlStorageOptions(options[key] ?? {})
            if (fieldOptions.push) {
                replace = false
            }
        }

        const entries = (() => {
            const result: Array<[string, string]> = []
            for (const [key, value] of Object.entries(current)) {
                if (!value) {
                    continue
                }

                result.push([key, value])
            }

            return result
        })()

        urlStateControls.set(entries, { replace })
    }

    const subscribe: GlobalStorage["subscribe"] = (callback) => {
        const cleanup = sync.listen(callback)

        return () => {
            cleanup()
        }
    }

    return {
        type: "global",
        get,
        set,
        subscribe,
    }
})()
