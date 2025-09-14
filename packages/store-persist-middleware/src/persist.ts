import { Serializer } from "@deivshon/serialization"
import { AsyncStorage, Storage, StorageInstance, SyncStorage } from "@deivshon/storage"
import { AtomState, Middleware, Store } from "@deivshon/store"

type PersistenceOptions = Partial<{
    key: string
}>

type Persistence<TState extends Record<string, unknown>> = {
    [TKey in keyof TState]?:
        | [Serializer<TState[TKey]>, StorageInstance]
        | [Serializer<TState[TKey]>, StorageInstance, PersistenceOptions | undefined]
}

export const persistStore = <TState extends Record<string, unknown>>(
    name: string,
    persistence: Persistence<TState>,
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
        for (const stateKey in persistence) {
            const persistenceData = extractFromPersistence(name, persistence, stateKey)
            if (!persistenceData) {
                continue
            }

            const [serializer, { storage }, { key: storedKey }] = persistenceData
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
                const computed = stored.then((stored) => {
                    if (typeof stored[storedKey] !== "string" || !initialState) {
                        return {}
                    }

                    const deserialized = serializer.deserialize(stored[storedKey])

                    const result: Partial<TState> = {}
                    result[stateKey] = deserialized.success ? deserialized.value : initialState[stateKey]

                    return result
                })
                asyncValues.push(computed)
            } else {
                if (typeof stored[storedKey] !== "string") {
                    continue
                }

                const deserialized = serializer.deserialize(stored[storedKey])
                syncValues[stateKey] = deserialized.success ? deserialized.value : initialState[stateKey]
            }
        }

        return {
            syncValues,
            asyncValues: Promise.all(asyncValues).then((values) =>
                values.reduce((acc, current) => ({ ...acc, ...current }), {}),
            ),
        }
    }

    const mapToPersistenceKeys = <T>(object: Partial<Record<keyof TState, T>>): Partial<Record<string, T>> => {
        const result: Partial<Record<string, T>> = {}

        for (const objectKey in object) {
            const persistenceData = extractFromPersistence(name, persistence, objectKey)
            if (!persistenceData) {
                continue
            }

            const [, , { key: storedKey }] = persistenceData
            result[storedKey] = object[objectKey]
        }

        return result
    }

    const setToStorage = (
        values: Map<
            Storage,
            {
                update: Partial<Record<keyof TState, string>>
                options: Partial<Record<keyof TState, StorageInstance["options"]>>
            }
        >,
    ): void => {
        for (const [storage, { update: rawUpdate, options: rawOptions }] of values.entries()) {
            const update = mapToPersistenceKeys(rawUpdate)
            const options = mapToPersistenceKeys(rawOptions)

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
            for (const stateKey in persistence) {
                if (stateKey in storageValues) {
                    continue
                }

                const persistenceData = extractFromPersistence(name, persistence, stateKey)
                if (!persistenceData || persistenceData[1].storage !== storage) {
                    continue
                }

                update[stateKey] = initialState[stateKey]
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

            for (const stateKey in persistence) {
                const persistenceData = extractFromPersistence(name, persistence, stateKey)
                if (!persistenceData) {
                    continue
                }

                const [, { storage }] = persistenceData
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
                    update: Partial<Record<keyof TState, string>>
                    options: Partial<Record<keyof TState, StorageInstance["options"]>>
                }
            >()

            for (const key in update) {
                const updatedValue = newState[key]

                if (!persistence[key]) {
                    continue
                }

                const [serializer, { storage, options }] = persistence[key]
                const serialized = serializer.serialize(updatedValue)

                const current: {
                    update: Partial<Record<keyof TState, string>>
                    options: Partial<Record<keyof TState, StorageInstance["options"]>>
                } = values.get(storage) ?? { update: {}, options: {} }
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
    opts?: PersistenceOptions,
): Middleware<AtomState<T>> =>
    persistStore<AtomState<T>>(name, {
        value: [serializer, storage, opts],
    })

const extractFromPersistence = <TState extends Record<string, unknown>, TKey extends Extract<keyof TState, string>>(
    name: string,
    persistence: Persistence<TState>,
    key: TKey,
): [Serializer<TState[TKey]>, StorageInstance, Required<PersistenceOptions>] | null => {
    const entry = persistence[key]
    if (!entry) {
        return null
    }

    const [serializer, storageInstance, opts] = entry

    const storedKey = opts?.key ?? (storageInstance.storage.type === "named" ? key : `${name}-${key}`)
    return [serializer, storageInstance, { key: storedKey }]
}
