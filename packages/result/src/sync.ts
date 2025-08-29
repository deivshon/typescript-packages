import { asyncFn, errAsync, fromSafePromise, ResultAsync } from "./async"
import { throwErrorUnwrapError, throwValueUnwrapError } from "./errors"
import { tap } from "./internal/effects"
import { identity } from "./internal/values"

export interface $SyncCore<TValue, TError> {
    async: false
    map: <const TMappedValue>(mapper: (value: TValue) => TMappedValue) => Result<TMappedValue, TError>
    mapErr: <const TMappedError>(mapper: (error: TError) => TMappedError) => Result<TValue, TMappedError>
    asyncMap: <const TMappedValue>(
        mapper: (value: TValue) => Promise<TMappedValue>,
    ) => ResultAsync<TMappedValue, TError>
    bind: <const TBoundValue, const TBoundError>(
        binder: (value: TValue) => Result<TBoundValue, TBoundError>,
    ) => Result<TBoundValue, TError | TBoundError>
    bindErr: <const TBoundValue, const TBoundError>(
        binder: (error: TError) => Result<TBoundValue, TBoundError>,
    ) => Result<TValue | TBoundValue, TBoundError>
    asyncBind: <const TBoundValue, const TBoundError>(
        asyncBinder: (
            value: TValue,
        ) => Promise<Result<TBoundValue, TBoundError>> | ResultAsync<TBoundValue, TBoundError>,
    ) => ResultAsync<TBoundValue, TError | TBoundError>
    effect: (effect: (value: TValue) => unknown) => Result<TValue, TError>
    effectErr: (effect: (error: TError) => unknown) => Result<TValue, TError>
    through: <const TEffectError>(
        effect: (value: TValue) => Result<unknown, TEffectError>,
    ) => Result<TValue, TError | TEffectError>
    asyncThrough: <const TEffectError>(
        effect: (value: TValue) => Promise<Result<unknown, TEffectError>> | ResultAsync<unknown, TEffectError>,
    ) => ResultAsync<TValue, TError | TEffectError>
    unwrapOr: <const TOr>(value: TOr) => TValue | TOr
    unwrapErrOr<const TOr>(value: TOr): TError | TOr
    dangerouslyUnwrap: () => TValue
    dangerouslyUnwrapErr: () => TError
}

export interface Ok<TValue, TError> extends $SyncCore<TValue, TError> {
    success: true
    value: TValue
}

export interface Err<TValue, TError> extends $SyncCore<TValue, TError> {
    success: false
    error: TError
}

export type Result<TValue, TError> = Ok<TValue, TError> | Err<TValue, TError>

export const ok = <const TValue>(value: TValue): Ok<TValue, never> => {
    const self = () => ok(value)
    const extract = () => value

    return {
        async: false,
        success: true,
        value,
        map: (mapper) => ok(mapper(value)),
        mapErr: self,
        asyncMap: (mapper) => fromSafePromise(mapper(value)),
        bind: (binder) => binder(value),
        bindErr: self,
        asyncBind: (binder) => asyncFn(binder)(value),
        effect: (effect) => tap(value, effect, extract, ok),
        effectErr: self,
        unwrapOr: extract,
        unwrapErrOr: identity,
        dangerouslyUnwrap: extract,
        dangerouslyUnwrapErr: throwValueUnwrapError,
        through: (effect) => tap(value, effect, (result) => (result.success ? ok(value) : err(result.error)), identity),
        asyncThrough: (effect) => asyncFn(effect)(value).map(extract),
    }
}

export const err = <const TError>(error: TError): Err<never, TError> => {
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

export const syncFn =
    <TArgs extends readonly unknown[], const TValue, const TError>(fn: (...args: TArgs) => Result<TValue, TError>) =>
    (...args: TArgs) =>
        fn(...args)

export const safeSyncFn =
    <TArgs extends readonly unknown[], const TValue, const TError, const THandledError>(
        fn: (...args: TArgs) => Result<TValue, TError>,
        errorHandler: (error: unknown) => THandledError,
    ) =>
    (...args: TArgs): Result<TValue, TError | THandledError> => {
        try {
            return fn(...args)
        } catch (error) {
            return err(errorHandler(error))
        }
    }

export const trySync = <const TReturn>(fn: () => TReturn): Result<TReturn, unknown> => {
    try {
        return ok(fn())
    } catch (error) {
        return err(error)
    }
}

export const syncSafeguard =
    <TArgs extends readonly unknown[], const TReturn>(fn: (...args: TArgs) => TReturn) =>
    (...args: TArgs): Result<TReturn, unknown> =>
        trySync(() => fn(...args))

export const collapseSync = <const TValue, const TError>(result: Result<TValue, TError>): Result<TValue, TError> =>
    result

export const Result = {
    ok,
    err,
    fn: syncFn,
    safeFn: safeSyncFn,
    try: trySync,
    safeguard: syncSafeguard,
    collapse: collapseSync,
}
