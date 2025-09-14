import { Serializer } from "@deivshon/serialization"
import { AsyncStorage, Storage, StorageInstance, SyncStorage } from "@deivshon/storage"
import { AtomState, Middleware, Store } from "@deivshon/store"

export const persistStore = <TState extends Record<string, unknown>>(
    name: string,
    persistence: {
        [TKey in keyof TState]?: [Serializer<TState[TKey]>, StorageInstance]
    },
): Middleware<TState> => {
    const shouldSync = Symbol()

    let initialState: TState | null = null
    let set: Store<TState, Record<string, unknown>>["set"] | null = null
    const storageSubscriptions = new Map<Storage, { unsubscribe: () => void }>()

    const getFromStorage = (opts: {
        storage: "all" | Storage | ((storage: Storage) => boolean)
    }): { syncValues: Partial<TState>; asyncValues: Promise<Partial<TState>> } => {
        const syncValues: Partial<TState> = {}
        const asyncValues: Array<Promise<Partial<TState>>> = []
        if (!initialState) {
            return { syncValues, asyncValues: Promise.resolve({}) }
        }

        const skipStorage = (storage: Storage): boolean => {
            if (opts.storage === "all") {
                return false
            } else if (opts.storage instanceof Function) {
                return !opts.storage(storage)
            } else {
                return storage !== opts.storage
            }
        }

        const syncStoredCache = new Map<SyncStorage, Partial<Record<string, string>>>()
        const asyncStoredCache = new Map<AsyncStorage, Promise<Partial<Record<string, string>>>>()
        for (const key in persistence) {
            if (!persistence[key]) {
                continue
            }

            const [serializer, { storage }] = persistence[key]
            if (skipStorage(storage)) {
                continue
            }

            const stored =
                (storage.async ? asyncStoredCache.get(storage) : syncStoredCache.get(storage)) ??
                (() => {
                    if (storage.async) {
                        const retrieval = storage.get(name)
                        asyncStoredCache.set(storage, retrieval)
                        return retrieval
                    } else {
                        const retrieved = storage.get(name)
                        syncStoredCache.set(storage, retrieved)
                        return retrieved
                    }
                })()

            if (stored instanceof Promise) {
                const computed = stored.then((values) => {
                    if (typeof values[key] !== "string" || !initialState) {
                        return {}
                    }

                    const deserialized = serializer.deserialize(values[key])

                    const result: Partial<TState> = {}
                    result[key] = deserialized.success ? deserialized.value : initialState[key]

                    return result
                })
                asyncValues.push(computed)
            } else {
                if (typeof stored[key] !== "string") {
                    continue
                }

                const deserialized = serializer.deserialize(stored[key])
                syncValues[key] = deserialized.success ? deserialized.value : initialState[key]
            }
        }

        return {
            syncValues,
            asyncValues: Promise.all(asyncValues).then((values) =>
                values.reduce((acc, current) => ({ ...acc, ...current }), {}),
            ),
        }
    }

    const setToStorage = (
        values: Map<
            Storage,
            {
                update: Partial<Record<string, string>>
                options: Partial<Record<string, StorageInstance["options"]>>
            }
        >,
    ): void => {
        for (const [storage, { update, options }] of values.entries()) {
            if (storage.type === "named") {
                void storage.update(name, update, options)
            } else {
                void storage.update(update, options)
            }
        }
    }

    const onStorageUpdate = (storage: Storage) => () => {
        if (!set) {
            return
        }

        const computeUpdate = (storageValues: Partial<TState>): Partial<TState> => {
            if (!initialState) {
                return storageValues
            }

            const update = { ...storageValues }
            for (const key in persistence) {
                if (key in storageValues || !persistence[key] || persistence[key][1].storage !== storage) {
                    continue
                }

                update[key] = initialState[key]
            }

            return update
        }

        if (storage.async) {
            void getFromStorage({ storage }).asyncValues.then((storageValues) => {
                const update = computeUpdate(storageValues)
                set?.(update, { [shouldSync]: false })
            })
        } else {
            const update = computeUpdate(getFromStorage({ storage }).syncValues)
            set(update, { [shouldSync]: false })
        }
    }

    return {
        onInit: (_, baseSet) => {
            set = baseSet

            for (const key in persistence) {
                if (!persistence[key]) {
                    continue
                }

                const [_, { storage }] = persistence[key]
                if (storage.type === "named" || !storage.subscribe || storageSubscriptions.get(storage)) {
                    continue
                }

                const unsubscribe = storage.subscribe(onStorageUpdate(storage))
                storageSubscriptions.set(storage, { unsubscribe })
            }

            void getFromStorage({ storage: (storage) => storage.async }).asyncValues.then((values) => {
                if (!set) {
                    return
                }

                set(values, { [shouldSync]: false })
            })
        },
        transformInitial: (state) => {
            initialState ??= state

            return {
                ...state,
                ...getFromStorage({ storage: "all" }).syncValues,
            }
        },
        onUpdate: (update, newState, meta) => {
            if (!initialState || meta[shouldSync] === false) {
                return
            }

            const values = new Map<
                Storage,
                {
                    update: Partial<Record<string, string>>
                    options: Partial<Record<string, StorageInstance["options"]>>
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

export const persistAtom = <T>(
    name: string,
    serializer: Serializer<T>,
    storage: StorageInstance,
): Middleware<AtomState<T>> =>
    persistStore<AtomState<T>>(name, {
        value: [serializer, storage],
    })
