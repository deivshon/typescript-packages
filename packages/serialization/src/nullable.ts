import { Serializer } from "./serde"

const $null = "null"

export const nullable = <T>(serializer: Serializer<T>): Serializer<T | null> => ({
    serialize: (value) => (value === null ? $null : `"${serializer.serialize(value)}"`),
    deserialize: (serialized) => (serialized === $null ? null : serializer.deserialize(serialized.slice(1, -1))),
})
