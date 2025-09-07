import { Serializer } from "@deivshon/serialization"
import { SyncGlobalStorage, SyncStorage, SyncStorageInstance } from "@deivshon/storage"
import { Middleware, Store } from "@deivshon/store"
import { NoFunctions } from "@deivshon/types-toolkit"

export const persist = <TState extends Record<string, unknown>>(
    name: string,
    persistence: {
        [TKey in keyof NoFunctions<TState>]?: [
            ((initial: TState[TKey]) => Serializer<TState[TKey]>) | Serializer<TState[TKey]>,
            SyncStorageInstance,
        ]
    },
): Middleware<TState> => {
    const shouldSync = Symbol()

    let initialState: TState | null = null
    const storageSubscriptions = new Map<SyncGlobalStorage, { unsubscribe: () => void }>()

    const getFromStorage = (opts: { storage: "all" | SyncStorage }) => {
        const values: Partial<TState> = {}
        if (!initialState) {
            return values
        }

        const storedCache = new Map<SyncStorage, Partial<Record<string, string>>>()
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

            const deserialized = normalizeSerializer(serializer, initialState[key]).deserialize(stored[key])
            values[key] = deserialized.success ? deserialized.value : initialState[key]
        }

        return values
    }

    const setToStorage = (
        values: Map<
            SyncStorage,
            {
                update: Partial<Record<string, string>>
                options: Partial<Record<string, SyncStorageInstance["options"]>>
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

    const onStorageUpdate = (storage: SyncStorage, set: Store<TState, Record<string, unknown>>["set"]) => () => {
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

        set(update, { [shouldSync]: false })
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
            initialState = state

            return {
                ...state,
                ...getFromStorage({ storage: "all" }),
            }
        },
        onUpdate: (update, newState, meta) => {
            if (!initialState || meta[shouldSync] === false) {
                return
            }

            const values = new Map<
                SyncStorage,
                {
                    update: Partial<Record<string, string>>
                    options: Partial<Record<string, SyncStorageInstance["options"]>>
                }
            >()

            for (const key in update) {
                const updatedValue = newState[key]

                if (!persistence[key]) {
                    continue
                }

                const [serializer, { storage, options }] = persistence[key]
                const serialized = normalizeSerializer(serializer, initialState[key]).serialize(updatedValue)

                const current = values.get(storage)

                if (!serialized.success) {
                    continue
                }

                values.set(storage, {
                    update: { ...current?.update, [key]: serialized.value },
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

const normalizeSerializer = <T>(raw: ((initial: T) => Serializer<T>) | Serializer<T>, initial: T): Serializer<T> =>
    raw instanceof Function ? raw(initial) : raw
