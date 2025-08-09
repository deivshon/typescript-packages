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

export const boolean: Serializer<boolean> = (() => {
    const string = {
        true: "true",
        false: "false",
    }

    return {
        serialize: (value) => (value ? string.true : string.false),
        deserialize: (serialized) => serialized === string.true,
    }
})()

export const date: Serializer<Date> = (() => {
    const invalid = String(NaN)

    return {
        serialize: (value) => {
            try {
                return value.toISOString()
            } catch {
                return invalid
            }
        },
        deserialize: (serialized) => (serialized === invalid ? new Date(NaN) : new Date(serialized)),
    }
})()

export const schema = <TSchema extends StandardSchemaV1>(
    schema: TSchema,
    initial: StandardSchemaV1.InferInput<TSchema>,
): Serializer<StandardSchemaV1.InferInput<TSchema>> => {
    const string = {
        undefined: "undefined",
    } as const

    return {
        serialize: (value: StandardSchemaV1.InferInput<TSchema>) => {
            if (value === undefined) {
                return string.undefined
            } else {
                return JSON.stringify(value)
            }
        },
        deserialize: (value: string) => {
            try {
                const deserialized: unknown = value === string.undefined ? undefined : JSON.parse(value)

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
    }
}
