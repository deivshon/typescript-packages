export type StorageContents = Partial<Record<string, string>>
export type StorageMutationOptions = Partial<Record<PropertyKey, Partial<Record<PropertyKey, unknown>>>>
export type StorageOptions = Partial<Record<PropertyKey, unknown>>

export type SyncNamedStorage = {
    async: false
    type: "named"
    get: (name: string) => StorageContents
    replace: (name: string, value: StorageContents, options: StorageMutationOptions) => void
    update: (name: string, value: StorageContents, options: StorageMutationOptions) => void
    subscribe?: (callback: () => void) => () => void
}
export type SyncNamedStorageInstance = {
    storage: SyncNamedStorage
    options: StorageOptions
}

export type AsyncNamedStorage = {
    async: true
    type: "named"
    get: (name: string) => Promise<StorageContents>
    replace: (name: string, value: StorageContents, options: StorageMutationOptions) => Promise<void>
    update: (name: string, value: StorageContents, options: StorageMutationOptions) => Promise<void>
    subscribe?: (callback: () => void) => () => void
}
export type AsyncNamedStorageInstance = {
    storage: AsyncNamedStorage
    options: StorageOptions
}

export type NamedStorage = SyncNamedStorage | AsyncNamedStorage
export type NamedStorageInstance = SyncNamedStorageInstance | AsyncNamedStorageInstance

export type SyncGlobalStorage = {
    async: false
    type: "global"
    get: () => StorageContents
    replace: (value: StorageContents, options: StorageMutationOptions) => void
    update: (value: StorageContents, options: StorageMutationOptions) => void
    subscribe?: (callback: () => void) => () => void
}
export type SyncGlobalStorageInstance = {
    storage: SyncGlobalStorage
    options: StorageOptions
}

export type AsyncGlobalStorage = {
    async: true
    type: "global"
    get: () => Promise<StorageContents>
    replace: (value: StorageContents, options: StorageMutationOptions) => Promise<void>
    update: (value: StorageContents, options: StorageMutationOptions) => Promise<void>
    subscribe?: (callback: () => void) => () => void
}
export type AsyncGlobalStorageInstance = {
    storage: AsyncGlobalStorage
    options: StorageOptions
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
