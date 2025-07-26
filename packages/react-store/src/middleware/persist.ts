import { NoFunctions } from "../helper"
import { Middleware } from "../store"

type Serializer<T> = {
    serialize: (value: T) => string
    deserialize: (serialized: string) => T
}

type Storage = {
    get: (name: string) => Partial<Record<PropertyKey, unknown>> | null
    set: (name: string, value: Partial<Record<PropertyKey, unknown>>) => void
}

export const persist = <TState extends Record<string, unknown>>(
    name: string,
    persistence: {
        [TKey in keyof NoFunctions<TState>]?: [Serializer<TState[TKey]>, Storage]
    },
): Middleware<TState> => {
    const getStoredValue = (key: string, storage: Storage): string | null => {
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

    const setStoredValue = (key: string, value: string, storage: Storage): void => {
        storage.set(name, {
            ...(storage.get(name) ?? {}),
            [key]: value,
        })
    }

    return {
        transformInitial: (state) => {
            const transformed: TState = {
                ...state,
            }

            for (const key in persistence) {
                if (!persistence[key]) {
                    continue
                }

                const [serializer, storage] = persistence[key]

                const storedValue = getStoredValue(key, storage)
                if (typeof storedValue !== "string") {
                    continue
                }

                const deserialized = serializer.deserialize(storedValue)
                transformed[key] = deserialized
            }

            return transformed
        },
        onUpdate: (update, newState) => {
            for (const key in update) {
                const updatedValue = newState[key]

                if (!persistence[key]) {
                    continue
                }

                const [serializer, storage] = persistence[key]
                const serialized = serializer.serialize(updatedValue)

                setStoredValue(key, serialized, storage)
            }
        },
    }
}

export const serde = (() => {
    const string: Serializer<string> = {
        serialize: (value) => value,
        deserialize: (serialized) => serialized,
    }
    const number: Serializer<number> = {
        serialize: (value) => String(value),
        deserialize: (serialized) => Number(serialized),
    }

    return {
        string,
        number,
    } as const
})()

export const storage = (() => {
    const fromNative = (native: globalThis.Storage): Storage => ({
        get: (name) => {
            const stored = native.getItem(name)
            if (!stored) {
                return null
            }

            const parsed: Partial<Record<PropertyKey, unknown>> | null = (() => {
                try {
                    const raw: unknown = JSON.parse(stored)
                    if (typeof raw !== "object" || !raw) {
                        return null
                    }

                    return raw
                } catch {
                    return null
                }
            })()

            return parsed
        },
        set: (name, value) => {
            const stringified = (() => {
                try {
                    return JSON.stringify(value)
                } catch {
                    return null
                }
            })()
            if (typeof stringified !== "string") {
                return
            }

            native.setItem(name, stringified)
        },
    })

    return {
        local: fromNative(localStorage),
        session: fromNative(sessionStorage),
    } as const
})()
