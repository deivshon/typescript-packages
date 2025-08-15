export type NamedStorage = {
    type: "named"
    get: (name: string) => Partial<Record<string, string>>
    set: (
        name: string,
        value: Partial<Record<string, string>>,
        options: Partial<Record<string, Partial<Record<PropertyKey, unknown>>>>,
    ) => void
}
export type NamedStorageInstance = {
    storage: NamedStorage
    options: Partial<Record<PropertyKey, unknown>>
}

export type GlobalStorage = {
    type: "global"
    get: () => Partial<Record<string, string>>
    set: (
        value: Partial<Record<string, string>>,
        options: Partial<Record<string, Partial<Record<PropertyKey, unknown>>>>,
    ) => void
    subscribe?: (callback: () => void) => () => void
}
export type GlobalStorageInstance = {
    storage: GlobalStorage
    options: Partial<Record<PropertyKey, unknown>>
}

export type Storage = NamedStorage | GlobalStorage
export type StorageInstance = NamedStorageInstance | GlobalStorageInstance
