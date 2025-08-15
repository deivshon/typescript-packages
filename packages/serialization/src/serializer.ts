import { StandardSchemaV1 } from "@standard-schema/spec"

export type Serializer<T> = {
    serialize: (value: T) => string
    deserialize: (serialized: string) => T
}

export const string: Serializer<string> = {
    serialize: (value) => quote(value),
    deserialize: (serialized) => unqoute(serialized),
}

export const number: Serializer<number> = {
    serialize: (value) => String(value),
    deserialize: (serialized) => Number(serialized),
}

export const boolean: Serializer<boolean> = {
    serialize: (value) => (value ? $serialized.true : $serialized.false),
    deserialize: (serialized) => serialized === $serialized.true,
}

export const date: Serializer<Date> = {
    serialize: (value) => {
        try {
            return quote(value.toISOString())
        } catch {
            return $serialized.invalidDate
        }
    },
    deserialize: (serialized) =>
        serialized === $serialized.invalidDate ? new Date(NaN) : new Date(unqoute(serialized)),
}

export const nullable = <T>(serializer: Serializer<T>): Serializer<T | null> => ({
    serialize: (value) => (value === null ? $serialized.null : serializer.serialize(value)),
    deserialize: (serialized) => (serialized === $serialized.null ? null : serializer.deserialize(serialized)),
})

export const optional = <T>(serializer: Serializer<T>): Serializer<T | undefined> => ({
    serialize: (value) => (value === undefined ? $serialized.undefined : serializer.serialize(value)),
    deserialize: (serialized) =>
        serialized === $serialized.undefined ? undefined : serializer.deserialize(serialized),
})

export const set =
    <T>(serializer: Serializer<T>) =>
    (initial: Set<T>): Serializer<Set<T>> => ({
        serialize: (value) => enhancedJsonStringify(Array.from(value).map(serializer.serialize)),
        deserialize: (serialized) => {
            try {
                const deserialized = enhancedJsonParse(serialized)
                if (!Array.isArray(deserialized)) {
                    return initial
                }
                const unknownItemsArray: unknown[] = deserialized

                const setItems: T[] = []
                for (const item of unknownItemsArray) {
                    if (typeof item !== "string") {
                        return initial
                    }

                    setItems.push(serializer.deserialize(item))
                }

                return new Set(setItems)
            } catch {
                return initial
            }
        },
    })

export type SchemaSerializable =
    | string
    | number
    | boolean
    | null
    | undefined
    | Array<Exclude<SchemaSerializable, undefined>>
    | { [TKey in string | number]: SchemaSerializable }

const baseSchema =
    <TSchema extends StandardSchemaV1>(
        schema: StandardSchemaV1.InferInput<TSchema> extends SchemaSerializable ? TSchema : never,
    ) =>
    (initial: StandardSchemaV1.InferInput<TSchema>): Serializer<StandardSchemaV1.InferInput<TSchema>> => ({
        serialize: (value: StandardSchemaV1.InferInput<TSchema>) => enhancedJsonStringify(value),
        deserialize: (serialized: string) => {
            try {
                const deserialized = enhancedJsonParse(serialized)

                const validation = schema["~standard"].validate(deserialized)
                if (validation instanceof Promise) {
                    return initial
                }

                if (validation.issues) {
                    return initial
                } else {
                    return validation.value
                }
            } catch {
                return initial
            }
        },
    })

export const schema = baseSchema
export const schemaWithFallback = <TSchema extends StandardSchemaV1>(
    schema: StandardSchemaV1.InferInput<TSchema> extends SchemaSerializable ? TSchema : never,
    fallback: StandardSchemaV1.InferInput<TSchema>,
): Serializer<StandardSchemaV1.InferInput<TSchema>> => baseSchema(schema)(fallback)

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
