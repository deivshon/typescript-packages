import { errAsync, ResultAsync } from "./async"

type Ok<TValue> = {
    success: true
    value: TValue
}

type Error<TError> = {
    success: false
    error: TError
}

export type Result<TValue, TError> = (Ok<TValue> | Error<TError>) & {
    async: false
    unwrapOr: <const TOr>(value: TOr) => TValue | TOr
    map: <const TMappedValue>(mapper: (value: TValue) => TMappedValue) => Result<TMappedValue, TError>
    mapErr: <const TMappedError>(mapper: (error: TError) => TMappedError) => Result<TValue, TMappedError>
    bind: <const TBoundValue, const TBoundError>(
        binder: (value: TValue) => Result<TBoundValue, TBoundError>,
    ) => Result<TBoundValue, TError | TBoundError>
    asyncBind: <const TBoundValue, const TBoundError>(
        asyncBinder: (value: TValue) => ResultAsync<TBoundValue, TError | TBoundError>,
    ) => ResultAsync<TBoundValue, TError | TBoundError>
}

export const ok = <const TValue, const TError = never>(value: TValue): Result<TValue, TError> => ({
    async: false,
    success: true,
    value,
    map: <const TMappedValue>(mapper: (value: TValue) => TMappedValue) => ok(mapper(value)),
    mapErr: <const TMappedError>() => ok<TValue, TMappedError>(value),
    unwrapOr: () => value,
    bind: <const TBoundValue, const TBoundError>(binder: (value: TValue) => Result<TBoundValue, TBoundError>) =>
        binder(value),
    asyncBind: <const TBoundValue, const TBoundError>(
        asyncBinder: (value: TValue) => ResultAsync<TBoundValue, TError | TBoundError>,
    ) => asyncBinder(value),
})

export const err = <const TError, const TValue = never>(error: TError): Result<TValue, TError> => ({
    async: false,
    success: false,
    error,
    unwrapOr: <const TOr>(or: TOr) => or,
    map: <const TMappedValue>() => err<TError, TMappedValue>(error),
    mapErr: <const TMappedError>(mapper: (error: TError) => TMappedError) => err(mapper(error)),
    bind: <const TBoundValue, const TBoundError>() => err<TError | TBoundError, TBoundValue>(error),
    asyncBind: <const TBoundValue, const TBoundError>() => errAsync<TError | TBoundError, TBoundValue>(error),
})

export const trySync = <TReturn>(fn: () => TReturn): Result<TReturn, unknown> => {
    try {
        return ok(fn())
    } catch (error) {
        return err(error)
    }
}

export const safeguardSync =
    <TArgs extends readonly unknown[], TReturn>(fn: (...args: TArgs) => TReturn) =>
    (...args: TArgs): Result<TReturn, unknown> =>
        trySync(() => fn(...args))

export const result = {
    ok,
    err,
    try: trySync,
    safeguard: safeguardSync,
}
