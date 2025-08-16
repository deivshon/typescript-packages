type Ok<TValue> = {
    success: true
    value: TValue
}

type Error<TError> = {
    success: false
    error: TError
}

export type Result<TValue, TError> = (Ok<TValue> | Error<TError>) & {
    unwrapOr: <const TOr>(value: TOr) => TValue | TOr
    map: <const TMappedValue>(mapper: (value: TValue) => TMappedValue) => Result<TMappedValue, TError>
    mapErr: <const TMappedError>(mapper: (error: TError) => TMappedError) => Result<TValue, TMappedError>
    bind: <const TBoundValue>(binder: (value: TValue) => Result<TBoundValue, TError>) => Result<TBoundValue, TError>
    asyncBind: <const TBoundValue>(
        asyncBinder: (value: TValue) => Promise<Result<TBoundValue, TError>>,
    ) => Promise<Result<TBoundValue, TError>>
}

export const ok = <const TValue, const TError = never>(value: TValue): Result<TValue, TError> => ({
    success: true,
    value,
    map: <const TMappedValue>(mapper: (value: TValue) => TMappedValue) => ok(mapper(value)),
    mapErr: <const TMappedError>(_: (_: TError) => TMappedError) => ok<TValue, TMappedError>(value),
    unwrapOr: <const TOr>(_: TOr) => value,
    bind: <const TBoundValue>(binder: (value: TValue) => Result<TBoundValue, TError>) => binder(value),
    asyncBind: <const TBoundValue>(asyncBinder: (value: TValue) => Promise<Result<TBoundValue, TError>>) =>
        asyncBinder(value),
})

export const err = <const TError, const TValue = never>(error: TError): Result<TValue, TError> => ({
    success: false,
    error,
    unwrapOr: <const TOr>(or: TOr) => or,
    map: <const TMappedValue>(_: (_: TValue) => TMappedValue) => err<TError, TMappedValue>(error),
    mapErr: <const TMappedError>(mapper: (error: TError) => TMappedError) => err(mapper(error)),
    bind: <const TBoundValue>(_: (_: TValue) => Result<TBoundValue, TError>) => err<TError, TBoundValue>(error),
    asyncBind: <const TBoundValue>(_: (_: TValue) => Promise<Result<TBoundValue, TError>>) =>
        Promise.resolve(err<TError, TBoundValue>(error)),
})
