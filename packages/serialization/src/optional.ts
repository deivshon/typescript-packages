import { Serializer } from "./serde"

const $undefined = "undefined"

export const optional = <T>(serializer: Serializer<T>): Serializer<T | undefined> => ({
    serialize: (value) => (value === undefined ? $undefined : `"${serializer.serialize(value)}"`),
    deserialize: (serialized) =>
        serialized === $undefined ? undefined : serializer.deserialize(serialized.slice(1, -1)),
})
