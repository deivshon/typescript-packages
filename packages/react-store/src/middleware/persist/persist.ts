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

    const getStorageValue = (key: string, storage: Storage): string | null => {
        const stored = storage.get(name)
        if (!stored) {
            return null
        }

        const storedValue = stored[key]
        if (typeof storedValue !== "string") {
            return null
        }

        return storedValue
    }

    const getAllStorageValues = (opts: { storage: "all" | Storage }) => {
        const values: Partial<TState> = {}

        for (const key in persistence) {
            if (!persistence[key]) {
                continue
            }

            const [serializer, storage] = persistence[key]
            if (opts.storage !== "all" && storage !== opts.storage) {
                continue
            }

            const storedValue = getStorageValue(key, storage)
            if (typeof storedValue !== "string") {
                continue
            }

            const deserialized = serializer.deserialize(storedValue)
            values[key] = deserialized
        }

        return values
    }

    const setStorageValue = (key: string, value: string, storage: Storage): void => {
        storage.set(name, {
            ...(storage.get(name) ?? {}),
            [key]: value,
        })
    }

    const onStorageChange = (storage: Storage, set: Store<TState, Record<string, unknown>>["set"]) => () => {
        const update = (() => {
            const values = getAllStorageValues({ storage })
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

                const unsubscribe = storage.subscribe(name, onStorageChange(storage, set))
                storageSubscriptions.set(storage.id, { unsubscribe })
            }
        },
        transformInitial: (state) => {
            initialState = {
                ...state,
                ...getAllStorageValues({ storage: "all" }),
            }
            return initialState
        },
        onUpdate: (update, newState) => {
            if (!syncOnUpdate) {
                return
            }

            for (const key in update) {
                const updatedValue = newState[key]

                if (!persistence[key]) {
                    continue
                }

                const [serializer, storage] = persistence[key]
                const serialized = serializer.serialize(updatedValue)

                setStorageValue(key, serialized, storage)
            }
        },
        onDestroy: () => {
            for (const [_, { unsubscribe }] of storageSubscriptions) {
                unsubscribe()
            }
        },
    }
}
