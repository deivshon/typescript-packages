import { NoFunctions } from "../../helper"
import { Middleware, Store } from "../../store"
import { Serializer } from "./serde"
import { Storage } from "./storage"

export const persist = <TState extends Record<string, unknown>>(
    name: string,
    persistence: {
        [TKey in keyof NoFunctions<TState>]?: [Serializer<TState[TKey]>, Storage]
    },
): Middleware<TState> => {
    let initialState: TState | null = null
    let syncOnUpdate = true
    const storageSubscriptions = new Map<symbol, { unsubscribe: () => void }>()

    const getFromStorage = (opts: { storage: "all" | Storage }) => {
        const values: Partial<TState> = {}

        const storedCache = new Map<Storage, Partial<Record<PropertyKey, unknown>>>()
        for (const key in persistence) {
            if (!persistence[key]) {
                continue
            }

            const [serializer, storage] = persistence[key]
            if (opts.storage !== "all" && storage !== opts.storage) {
                continue
            }

            const stored = (() => {
                const cached = storedCache.get(storage)
                if (cached) {
                    return cached
                }

                const retrieved = storage.get(name)
                storedCache.set(storage, retrieved ?? {})

                return retrieved
            })()
            if (!stored || typeof stored[key] !== "string") {
                continue
            }

            const deserialized = serializer.deserialize(stored[key])
            values[key] = deserialized
        }

        return values
    }

    const setToStorage = (values: Map<Storage, Partial<Record<string, string>>>): void => {
        for (const [storage, updatedValues] of values.entries()) {
            storage.set(name, {
                ...storage.get(name),
                ...updatedValues,
            })
        }
    }

    const onStorageUpdate = (storage: Storage, set: Store<TState, Record<string, unknown>>["set"]) => () => {
        const update = (() => {
            const values = getFromStorage({ storage })
            if (!initialState) {
                return values
            }

            for (const key in persistence) {
                if (key in values || !persistence[key] || persistence[key][1] !== storage) {
                    continue
                }

                values[key] = initialState[key]
            }

            return values
        })()

        syncOnUpdate = false
        set(update)
        syncOnUpdate = true
    }

    return {
        onInit: (_, set) => {
            for (const key in persistence) {
                if (!persistence[key]) {
                    continue
                }

                const [_, storage] = persistence[key]
                if (!storage.subscribe || storageSubscriptions.get(storage.id)) {
                    continue
                }

                const unsubscribe = storage.subscribe(name, onStorageUpdate(storage, set))
                storageSubscriptions.set(storage.id, { unsubscribe })
            }
        },
        transformInitial: (state) => {
            initialState = {
                ...state,
                ...getFromStorage({ storage: "all" }),
            }
            return initialState
        },
        onUpdate: (update, newState) => {
            if (!syncOnUpdate) {
                return
            }

            const values = new Map<Storage, Partial<Record<string, string>>>()

            for (const key in update) {
                const updatedValue = newState[key]

                if (!persistence[key]) {
                    continue
                }

                const [serializer, storage] = persistence[key]
                const serialized = serializer.serialize(updatedValue)

                const current = values.get(storage) ?? {}
                values.set(storage, { ...current, [key]: serialized })
            }

            setToStorage(values)
        },
        onDestroy: () => {
            for (const [_, { unsubscribe }] of storageSubscriptions) {
                unsubscribe()
            }
        },
    }
}
