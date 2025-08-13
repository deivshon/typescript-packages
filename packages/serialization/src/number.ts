import { Serializer } from "./serde"

export const number: Serializer<number> = {
    serialize: (value) => String(value),
    deserialize: (serialized) => Number(serialized),
}
