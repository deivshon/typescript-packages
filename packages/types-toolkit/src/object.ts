type PlainObject = Record<PropertyKey, unknown>
export type WithoutValuesOfType<T extends PlainObject, F> = {
    [TKey in keyof T as T[TKey] extends F ? never : TKey]: T[TKey]
}
export type NoFunctions<T extends PlainObject> = WithoutValuesOfType<T, (...args: never[]) => unknown>
