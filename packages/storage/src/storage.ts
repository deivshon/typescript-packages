import { local, session } from "./native"
import { url } from "./url"

export type NamedStorage = {
    type: "named"
    get: (name: string) => Partial<Record<string, string>>
    set: (
        name: string,
        value: Partial<Record<string, string>>,
        options: Partial<Record<string, Partial<Record<PropertyKey, unknown>>>>,
    ) => void
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

export type Storage = NamedStorage | GlobalStorage

export const storage = {
    local,
    session,
    url,
}
