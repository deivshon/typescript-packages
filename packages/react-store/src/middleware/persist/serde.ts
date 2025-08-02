import { StandardSchemaV1 } from "@standard-schema/spec"

export type Serializer<T> = {
    serialize: (value: T) => string
    deserialize: (serialized: string) => T
}

export const string: Serializer<string> = {
    serialize: (value) => value,
    deserialize: (serialized) => serialized,
}

export const number: Serializer<number> = {
    serialize: (value) => String(value),
    deserialize: (serialized) => Number(serialized),
}

export const schema = <TSchema extends StandardSchemaV1>(
    schema: TSchema,
    initial: StandardSchemaV1.InferInput<TSchema>,
): Serializer<StandardSchemaV1.InferInput<TSchema>> => ({
    serialize: (value: StandardSchemaV1.InferInput<TSchema>) => JSON.stringify(value),
    deserialize: (value: string) => {
        try {
            const deserialized: unknown = JSON.parse(value)

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
