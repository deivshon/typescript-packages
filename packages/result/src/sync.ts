import { errAsync, ResultAsync } from "./async"
import { tap } from "./internal/effects"

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
    effect: (effect: (value: TValue) => unknown) => Result<TValue, TError>
    effectErr: (effect: (error: TError) => unknown) => Result<TValue, TError>
}

export const ok = <const TValue, const TError = never>(value: TValue): Result<TValue, TError> => ({
    async: false,
    success: true,
    value,
    map: (mapper) => ok(mapper(value)),
    mapErr: () => ok(value),
    unwrapOr: () => value,
    bind: (binder) => binder(value),
    asyncBind: (asyncBinder) => asyncBinder(value),
    effect: (effect) => tap(value, effect, ok),
    effectErr: () => ok(value),
})

export const err = <const TError, const TValue = never>(error: TError): Result<TValue, TError> => ({
    async: false,
    success: false,
    error,
    unwrapOr: (or) => or,
    map: () => err(error),
    mapErr: (mapper) => err(mapper(error)),
    bind: () => err(error),
    asyncBind: () => errAsync(error),
    effect: () => err(error),
    effectErr: (effect) => tap(error, effect, err),
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
