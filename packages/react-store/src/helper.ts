export type NoFunctions<TObj extends Record<PropertyKey, unknown>> = {
    [TKey in keyof TObj as TObj[TKey] extends (...args: never[]) => unknown ? never : TKey]: TObj[TKey]
}
