export type SyncNamedStorage = {
    async: false
    type: "named"
    get: (name: string) => Partial<Record<string, string>>
    set: (
        name: string,
        value: Partial<Record<string, string>>,
        options: Partial<Record<string, Partial<Record<PropertyKey, unknown>>>>,
    ) => void
}
export type SyncNamedStorageInstance = {
    storage: SyncNamedStorage
    options: Partial<Record<PropertyKey, unknown>>
}

export type AsyncNamedStorage = {
    async: true
    type: "named"
    get: (name: string) => Promise<Partial<Record<string, string>>>
    set: (
        name: string,
        value: Partial<Record<string, string>>,
        options: Partial<Record<string, Partial<Record<PropertyKey, unknown>>>>,
    ) => Promise<void>
}
export type AsyncNamedStorageInstance = {
    storage: AsyncNamedStorage
    options: Partial<Record<PropertyKey, unknown>>
}

export type NamedStorage = SyncNamedStorage | AsyncNamedStorage
export type NamedStorageInstance = SyncNamedStorageInstance | AsyncNamedStorageInstance

export type SyncGlobalStorage = {
    async: false
    type: "global"
    get: () => Partial<Record<string, string>>
    set: (
        value: Partial<Record<string, string>>,
        options: Partial<Record<string, Partial<Record<PropertyKey, unknown>>>>,
    ) => void
    subscribe?: (callback: () => void) => () => void
}
export type SyncGlobalStorageInstance = {
    storage: SyncGlobalStorage
    options: Partial<Record<PropertyKey, unknown>>
}

export type AsyncGlobalStorage = {
    async: true
    type: "global"
    get: () => Promise<Partial<Record<string, string>>>
    set: (
        value: Partial<Record<string, string>>,
        options: Partial<Record<string, Partial<Record<PropertyKey, unknown>>>>,
    ) => Promise<void>
}
export type AsyncGlobalStorageInstance = {
    storage: AsyncGlobalStorage
    options: Partial<Record<PropertyKey, unknown>>
}

export type GlobalStorage = SyncGlobalStorage | AsyncGlobalStorage
export type GlobalStorageInstance = SyncGlobalStorageInstance | AsyncGlobalStorageInstance

export type SyncStorage = SyncNamedStorage | SyncGlobalStorage
export type AsyncStorage = AsyncNamedStorage | AsyncGlobalStorage
export type Storage = SyncNamedStorage | SyncGlobalStorage | AsyncNamedStorage | AsyncGlobalStorage

export type SyncStorageInstance = SyncNamedStorageInstance | SyncGlobalStorageInstance
export type AsyncStorageInstance = AsyncNamedStorageInstance | AsyncGlobalStorageInstance
export type StorageInstance =
    | SyncNamedStorageInstance
    | SyncGlobalStorageInstance
    | AsyncNamedStorageInstance
    | AsyncGlobalStorageInstance
