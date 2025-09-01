import { StandardSchemaV1 } from "@standard-schema/spec"

type SerializationResult = { success: true; value: string } | { success: false }
type DeserializationResult<T> = { success: true; value: T } | { success: false }

const ok = <T>(value: T) => ({ success: true, value }) as const
const err = () => ({ success: false }) as const

export type Serializer<T> = {
    serialize: (value: T) => SerializationResult
    deserialize: (serialized: string) => DeserializationResult<T>
}

export const string: Serializer<string> = {
    serialize: (value) => ok(quote(value)),
    deserialize: (serialized) => ok(unqoute(serialized)),
}

export const number: Serializer<number> = {
    serialize: (value) => ok(String(value)),
    deserialize: (serialized) => ok(Number(serialized)),
}

export const boolean: Serializer<boolean> = {
    serialize: (value) => ok(value ? $serialized.true : $serialized.false),
    deserialize: (serialized) => ok(serialized === $serialized.true),
}

export const date: Serializer<Date> = {
    serialize: (value) => {
        try {
            return ok(quote(value.toISOString()))
        } catch {
            return ok($serialized.invalidDate)
        }
    },
    deserialize: (serialized) =>
        ok(serialized === $serialized.invalidDate ? new Date(NaN) : new Date(unqoute(serialized))),
}

export const nullable = <T>(serializer: Serializer<T>): Serializer<T | null> => ({
    serialize: (value) => (value === null ? ok($serialized.null) : serializer.serialize(value)),
    deserialize: (serialized) => (serialized === $serialized.null ? ok(null) : serializer.deserialize(serialized)),
})

export const optional = <T>(serializer: Serializer<T>): Serializer<T | undefined> => ({
    serialize: (value) => (value === undefined ? ok($serialized.undefined) : serializer.serialize(value)),
    deserialize: (serialized) =>
        serialized === $serialized.undefined ? ok(undefined) : serializer.deserialize(serialized),
})

export const set = <T>(serializer: Serializer<T>): Serializer<Set<T>> => ({
    serialize: (value) => {
        try {
            return ok(enhancedJsonStringify(Array.from(value).map(serializer.serialize)))
        } catch {
            return err()
        }
    },
    deserialize: (serialized) => {
        let deserialized
        try {
            deserialized = enhancedJsonParse(serialized)
        } catch {
            return err()
        }

        if (!Array.isArray(deserialized)) {
            return err()
        }
        const unknownItemsArray: unknown[] = deserialized

        const setItems: T[] = []
        for (const item of unknownItemsArray) {
            if (typeof item !== "string") {
                return err()
            }

            const deserialized = serializer.deserialize(item)
            if (!deserialized.success) {
                return err()
            }
            setItems.push(deserialized.value)
        }

        return ok(new Set(setItems))
    },
})

export const map = <K, V>(keySerializer: Serializer<K>, valueSerializer: Serializer<V>): Serializer<Map<K, V>> => ({
    serialize: (value) => {
        const entriesResults = Array.from(
            value
                .entries()
                .map(([key, value]) => [keySerializer.serialize(key), valueSerializer.serialize(value)] as const),
        )

        const entries: Array<[string, string]> = []
        for (const result of entriesResults) {
            if (!result[0].success || !result[1].success) {
                return err()
            }

            entries.push([result[0].value, result[1].value])
        }

        try {
            return ok(enhancedJsonStringify(entries))
        } catch {
            return err()
        }
    },
    deserialize: (serialized) => {
        let deserialized
        try {
            deserialized = enhancedJsonParse(serialized)
        } catch {
            return err()
        }

        if (!Array.isArray(deserialized)) {
            return err()
        }
        const unknownEntriesArray: unknown[] = deserialized

        const entries: Array<[K, V]> = []
        for (const unknownEntry of unknownEntriesArray) {
            if (!Array.isArray(unknownEntry) || unknownEntry.length > 2) {
                return err()
            }

            const serializedKey: unknown = unknownEntry.at(0)
            const serializedValue: unknown = unknownEntry.at(1)
            if (typeof serializedKey !== "string" || typeof serializedValue !== "string") {
                return err()
            }

            const deserializedKey = keySerializer.deserialize(serializedKey)
            const deserializedValue = valueSerializer.deserialize(serializedValue)
            if (!deserializedKey.success || !deserializedValue.success) {
                return err()
            }

            entries.push([deserializedKey.value, deserializedValue.value])
        }

        return ok(new Map(entries))
    },
})

export type SchemaSerializable =
    | string
    | number
    | boolean
    | null
    | undefined
    | Array<Exclude<SchemaSerializable, undefined>>
    | { [K in string | number]: SchemaSerializable }

export const schema = <S extends StandardSchemaV1>(
    schema: StandardSchemaV1.InferInput<S> extends SchemaSerializable ? S : never,
): Serializer<StandardSchemaV1.InferInput<S>> => ({
    serialize: (value: StandardSchemaV1.InferInput<S>) => {
        try {
            return ok(enhancedJsonStringify(value))
        } catch {
            return err()
        }
    },
    deserialize: (serialized: string) => {
        let deserialized
        try {
            deserialized = enhancedJsonParse(serialized)
        } catch {
            return err()
        }

        let validation
        try {
            validation = schema["~standard"].validate(deserialized)
        } catch {
            return err()
        }

        if (validation instanceof Promise || validation.issues) {
            return err()
        }

        return ok(validation.value)
    },
})

const $serialized = {
    true: "true",
    false: "false",
    null: "null",
    undefined: "undefined",
    invalidDate: "invalid-date",
} as const

const quote = (value: string) => `"${value}"`
const unqoute = (value: string) => value.slice(1, -1)

const enhancedJsonStringify = (value: unknown): string =>
    value === undefined ? $serialized.undefined : JSON.stringify(value)
const enhancedJsonParse = (string: string): unknown =>
    string === $serialized.undefined ? undefined : JSON.parse(string)
