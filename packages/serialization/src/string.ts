import { Serializer } from "./serde"

export const string: Serializer<string> = {
    serialize: (value) => value,
    deserialize: (serialized) => serialized,
}
