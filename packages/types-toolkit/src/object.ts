type PlainObject = Record<PropertyKey, unknown>
export type WithoutValuesOfType<TObj extends PlainObject, TForbiddenValueType> = {
    [TKey in keyof TObj as TObj[TKey] extends TForbiddenValueType ? never : TKey]: TObj[TKey]
}
export type NoFunctions<TObj extends PlainObject> = WithoutValuesOfType<TObj, (...args: never[]) => unknown>
