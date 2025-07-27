import { NoFunctions } from "../../helper"
import { Middleware } from "../../store"
import { Serializer } from "./serde"
import { Storage } from "./storage"

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
