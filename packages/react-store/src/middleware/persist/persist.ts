import { NoFunctions } from "../../helper"
import { Middleware, Store } from "../../store"
import { Serializer } from "./serde"
import { GlobalStorage, Storage } from "./storage/storage"

export type StoragePersistence = {
    storage: Storage
    options: Partial<Record<PropertyKey, unknown>>
}

export const persist = <TState extends Record<string, unknown>>(
    name: string,
    persistence: {
        [TKey in keyof NoFunctions<TState>]?: [Serializer<TState[TKey]>, StoragePersistence]
    },
): Middleware<TState> => {
    let initialState: TState | null = null
    let syncOnUpdate = true
    const storageSubscriptions = new Map<GlobalStorage, { unsubscribe: () => void }>()

    const getFromStorage = (opts: { storage: "all" | Storage }) => {
        const values: Partial<TState> = {}

        const storedCache = new Map<Storage, Partial<Record<PropertyKey, unknown>>>()
        for (const key in persistence) {
            if (!persistence[key]) {
                continue
            }

            const [serializer, { storage }] = persistence[key]
            if (opts.storage !== "all" && storage !== opts.storage) {
                continue
            }

            const stored = (() => {
                const cached = storedCache.get(storage)
                if (cached) {
                    return cached
                }

                const retrieved = storage.get(name)
                storedCache.set(storage, retrieved)

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

    const setToStorage = (
        values: Map<
            Storage,
            {
                update: Partial<Record<string, string>>
                options: Partial<Record<string, StoragePersistence["options"]>>
            }
        >,
    ): void => {
        for (const [storage, { update, options }] of values.entries()) {
            if (storage.type === "named") {
                storage.set(
                    name,
                    {
                        ...storage.get(name),
                        ...update,
                    },
                    options,
                )
            } else {
                storage.set(
                    {
                        ...storage.get(),
                        ...update,
                    },
                    options,
                )
            }
        }
    }

    const onStorageUpdate = (storage: Storage, set: Store<TState, Record<string, unknown>>["set"]) => () => {
        const update = (() => {
            const values = getFromStorage({ storage })
            if (!initialState) {
                return values
            }

            for (const key in persistence) {
                if (key in values || !persistence[key] || persistence[key][1].storage !== storage) {
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

                const [_, { storage }] = persistence[key]
                if (storage.type === "named" || !storage.subscribe || storageSubscriptions.get(storage)) {
                    continue
                }

                const unsubscribe = storage.subscribe(onStorageUpdate(storage, set))
                storageSubscriptions.set(storage, { unsubscribe })
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

            const values = new Map<
                Storage,
                {
                    update: Partial<Record<string, string>>
                    options: Partial<Record<string, StoragePersistence["options"]>>
                }
            >()

            for (const key in update) {
                const updatedValue = newState[key]

                if (!persistence[key]) {
                    continue
                }

                const [serializer, { storage, options }] = persistence[key]
                const serialized = serializer.serialize(updatedValue)

                const current = values.get(storage)
                values.set(storage, {
                    update: { ...current?.update, [key]: serialized },
                    options: { ...current?.options, [key]: options },
                })
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
