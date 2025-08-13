export type Serializer<T> = {
    serialize: (value: T) => string
    deserialize: (serialized: string) => T
}
