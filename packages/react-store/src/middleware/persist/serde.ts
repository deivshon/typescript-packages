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
