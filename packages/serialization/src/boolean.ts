import { Serializer } from "./serde"

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
