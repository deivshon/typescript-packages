import { NoFunctions } from "../helper"
import { Middleware } from "../store"

type Serializer<T> = {
    serialize: (value: T) => string
    deserialize: (serialized: string) => T
}

export const persist = <TState extends Record<string, unknown>>(
    name: string,
    serializers: {
        [TKey in keyof NoFunctions<TState>]?: Serializer<TState[TKey]>
    },
): Middleware<TState> => {
    const getStored = (): Partial<Record<PropertyKey, unknown>> | null => {
        const raw = localStorage.getItem(name)
        if (!raw) {
            return null
        }

        try {
            const parsed: unknown = JSON.parse(raw)
            if (typeof parsed !== "object" || !parsed) {
                return null
            }

            return parsed
        } catch {
            return null
        }
    }
    const setStored = (stored: Partial<Record<PropertyKey, unknown>>): void => {
        const stringified = (() => {
            try {
                return JSON.stringify(stored)
            } catch {
                return null
            }
        })()
        if (typeof stringified !== "string") {
            return
        }

        localStorage.setItem(name, stringified)
    }

    return {
        transformInitial: (state) => {
            const stored = getStored()
            if (!stored) {
                return state
            }

            const transformed: TState = {
                ...state,
            }

            for (const key in serializers) {
                const serializer = serializers[key]
                if (!serializer) {
                    continue
                }

                const storedValue = stored[key]
                if (typeof storedValue !== "string") {
                    continue
                }

                const deserialized = serializer.deserialize(storedValue)
                transformed[key] = deserialized
            }

            return transformed
        },
        onUpdate: (update, newState) => {
            const newStored = getStored() ?? {}

            for (const key in update) {
                const updatedValue = newState[key]

                const serializer = serializers[key]
                if (!serializer) {
                    continue
                }

                const serialized = serializer.serialize(updatedValue)
                newStored[key] = serialized
            }

            setStored(newStored)
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
