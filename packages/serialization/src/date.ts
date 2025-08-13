import { Serializer } from "./serde"

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
