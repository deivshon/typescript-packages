import { StoragePersistence } from "../persist"
import { GlobalStorage } from "./storage"

type UrlStorageOptions = {
    push?: boolean
}

const parseUrlStorageOptions = (options: Partial<Record<never, unknown>>): Required<UrlStorageOptions> => ({
    push: "push" in options && typeof options.push === "boolean" ? options.push : false,
})

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
