import { StorageContents, StorageMutationOptions, SyncGlobalStorage, SyncGlobalStorageInstance } from "./storage"

type UrlStateSetOptions = {
    replace: boolean
}
type UrlStateControls = {
    get: () => Array<[string, string]>
    set: (entries: Array<[string, string]>, options: UrlStateSetOptions) => void
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

const $url: SyncGlobalStorage = (() => {
    const get: SyncGlobalStorage["get"] = () => {
        const entries = urlStateControls
            ? urlStateControls.get()
            : Array.from(new URLSearchParams(window.location.search))

        return entries.reduce<Partial<Record<string, string>>>((acc, [key, value]) => {
            acc[key] = value
            return acc
        }, {})
    }

    const optionsFromMutation = (value: StorageContents, options: StorageMutationOptions): UrlStateSetOptions => {
        let replace = true
        for (const key in value) {
            if (typeof key !== "string" || typeof value[key] !== "string") {
                continue
            }

            if (!(key in options)) {
                continue
            }

            const fieldOptions = parseUrlStorageOptions(options[key] ?? {})
            if (fieldOptions.push) {
                replace = false
            }
        }

        return {
            replace,
        }
    }
    const entriesFromContents = (value: StorageContents): Array<[string, string]> => {
        const result: Array<[string, string]> = []
        for (const [key, val] of Object.entries(value)) {
            if (!val) {
                continue
            }

            result.push([key, val])
        }

        return result
    }

    const mutate = (mode: "replace" | "update") => (value: StorageContents, options: StorageMutationOptions) => {
        if (!urlStateControls) {
            return
        }

        const { replace } = optionsFromMutation(value, options)
        const entries = entriesFromContents({ ...(mode === "update" ? get() : {}), ...value })
        urlStateControls.set(entries, { replace })
    }

    const subscribe: SyncGlobalStorage["subscribe"] = sync.listen

    return {
        async: false,
        type: "global",
        get,
        replace: mutate("replace"),
        update: mutate("update"),
        subscribe,
    }
})()

export const url = (options: UrlStorageOptions = {}): SyncGlobalStorageInstance => ({
    storage: $url,
    options,
})
