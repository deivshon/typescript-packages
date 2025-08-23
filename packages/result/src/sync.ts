import { errAsync, fromSafePromise, ResultAsync } from "./async"
import { throwErrorUnwrapError, throwValueUnwrapError } from "./errors"
import { tap } from "./internal/effects"
import { identity } from "./internal/values"

type Functions<TValue, TError> = {
    map: <const TMappedValue>(mapper: (value: TValue) => TMappedValue) => Result<TMappedValue, TError>
    mapErr: <const TMappedError>(mapper: (error: TError) => TMappedError) => Result<TValue, TMappedError>
    asyncMap: <const TMappedValue>(
        mapper: (value: TValue) => Promise<TMappedValue>,
    ) => ResultAsync<TMappedValue, TError>
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
    through: <const TEffectError>(
        effect: (value: TValue) => Result<unknown, TEffectError>,
    ) => Result<TValue, TError | TEffectError>
    asyncThrough: <const TEffectError>(
        effect: (value: TValue) => ResultAsync<unknown, TEffectError>,
    ) => ResultAsync<TValue, TError | TEffectError>
    unwrapOr: <const TOr>(value: TOr) => TValue | TOr
    unwrapErrOr<const TOr>(value: TOr): TError | TOr
    dangerouslyUnwrap: () => TValue
    dangerouslyUnwrapErr: () => TError
}

export type Ok<TValue> = {
    async: false
    success: true
    value: TValue
} & Functions<TValue, never>

export type Err<TError> = {
    async: false
    success: false
    error: TError
} & Functions<never, TError>

export type Result<TValue, TError> = Ok<TValue> | Err<TError>

export const ok = <const TValue>(value: TValue): Ok<TValue> => {
    const self = () => ok(value)
    const extract = () => value
    const apply = <const T>(fn: (value: TValue) => T) => fn(value)

    return {
        async: false,
        success: true,
        value,
        map: (mapper) => ok(mapper(value)),
        mapErr: self,
        asyncMap: (mapper) => fromSafePromise(mapper(value)),
        bind: apply,
        bindErr: self,
        asyncBind: apply,
        effect: (effect) => tap(value, effect, extract, ok),
        effectErr: self,
        unwrapOr: extract,
        unwrapErrOr: identity,
        dangerouslyUnwrap: extract,
        dangerouslyUnwrapErr: throwValueUnwrapError,
        through: (effect) => tap(value, effect, (result) => (result.success ? ok(value) : err(result.error)), identity),
        asyncThrough: (effect) => effect(value).map(extract),
    }
}

export const err = <const TError>(error: TError): Err<TError> => {
    const self = () => err(error)
    const asyncSelf = () => errAsync(error)
    const extract = () => error

    return {
        async: false,
        success: false,
        error,
        map: self,
        mapErr: (mapper) => err(mapper(error)),
        asyncMap: asyncSelf,
        bind: self,
        bindErr: (binder) => binder(error),
        asyncBind: asyncSelf,
        effect: self,
        effectErr: (effect) => tap(error, effect, extract, err),
        unwrapOr: identity,
        unwrapErrOr: extract,
        dangerouslyUnwrap: throwErrorUnwrapError,
        dangerouslyUnwrapErr: extract,
        through: self,
        asyncThrough: asyncSelf,
    }
}

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
