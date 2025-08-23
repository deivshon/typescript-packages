import { errAsync, ResultAsync } from "./async"
import { UnwrapError } from "./errors"
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
    map: <const TMappedValue>(mapper: (value: TValue) => TMappedValue) => Result<TMappedValue, TError>
    mapErr: <const TMappedError>(mapper: (error: TError) => TMappedError) => Result<TValue, TMappedError>
    bind: <const TBoundValue, const TBoundError>(
        binder: (value: TValue) => Result<TBoundValue, TError | TBoundError>,
    ) => Result<TBoundValue, TError | TBoundError>
    bindErr: <const TBoundValue, const TBoundError>(
        binder: (error: TError) => Result<TValue | TBoundValue, TBoundError>,
    ) => Result<TValue | TBoundValue, TBoundError>
    asyncBind: <const TBoundValue, const TBoundError>(
        asyncBinder: (value: TValue) => ResultAsync<TBoundValue, TError | TBoundError>,
    ) => ResultAsync<TBoundValue, TError | TBoundError>
    effect: (effect: (value: TValue) => unknown) => Result<TValue, TError>
    effectErr: (effect: (error: TError) => unknown) => Result<TValue, TError>
    unwrapOr: <const TOr>(value: TOr) => TValue | TOr
    unwrapErrOr<const TOr>(value: TOr): TError | TOr
    dangerouslyUnwrap: () => TValue
    dangerouslyUnwrapErr: () => TError
}

export const ok = <const TValue, const TError = never>(value: TValue): Result<TValue, TError> => ({
    async: false,
    success: true,
    value,
    map: (mapper) => ok(mapper(value)),
    mapErr: () => ok(value),
    bind: (binder) => binder(value),
    bindErr: () => ok(value),
    asyncBind: (asyncBinder) => asyncBinder(value),
    effect: (effect) => tap(value, effect, ok),
    effectErr: () => ok(value),
    unwrapOr: () => value,
    unwrapErrOr: (or) => or,
    dangerouslyUnwrap: () => value,
    dangerouslyUnwrapErr: () => {
        throw new UnwrapError("error")
    },
})

export const err = <const TError, const TValue = never>(error: TError): Result<TValue, TError> => ({
    async: false,
    success: false,
    error,
    map: () => err(error),
    mapErr: (mapper) => err(mapper(error)),
    bind: () => err(error),
    bindErr: (binder) => binder(error),
    asyncBind: () => errAsync(error),
    effect: () => err(error),
    effectErr: (effect) => tap(error, effect, err),
    unwrapOr: (or) => or,
    unwrapErrOr: () => error,
    dangerouslyUnwrap: () => {
        throw new UnwrapError("value")
    },
    dangerouslyUnwrapErr: () => error,
})

export const trySync = <const TReturn>(fn: () => TReturn): Result<TReturn, unknown> => {
    try {
        return ok(fn())
    } catch (error) {
        return err(error)
    }
}

export const safeguardSync =
    <TArgs extends readonly unknown[], const TReturn>(fn: (...args: TArgs) => TReturn) =>
    (...args: TArgs): Result<TReturn, unknown> =>
        trySync(() => fn(...args))

export const Result = {
    ok,
    err,
    try: trySync,
    safeguard: safeguardSync,
}
