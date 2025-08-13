import { StandardSchemaV1 } from "@standard-schema/spec"
import { Serializer } from "./serde"

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
