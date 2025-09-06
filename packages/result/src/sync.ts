import { asyncFn, errAsync, fromSafePromise, ResultAsync } from "./async"
import { throwErrorUnwrapError, throwValueUnwrapError } from "./errors"
import { identity, syncCatchAndIgnore } from "./internal/utils"

export interface $Result<T, E> {
    async: false
    map: <const M>(fn: (value: T) => M) => Result<M, E>
    mapErr: <const M>(fn: (error: E) => M) => Result<T, M>
    asyncMap: <const M>(fn: (value: T) => Promise<M>) => ResultAsync<M, E>
    bind: <const BT, const BE>(fn: (value: T) => Result<BT, BE>) => Result<BT, E | BE>
    bindErr: <const BT, const BE>(fn: (error: E) => Result<BT, BE>) => Result<T | BT, BE>
    asyncBind: <const BT, const BE>(
        fn: (value: T) => Promise<Result<BT, BE>> | ResultAsync<BT, BE>,
    ) => ResultAsync<BT, E | BE>
    tap: (fn: (value: T) => unknown) => Result<T, E>
    tapErr: (fn: (error: E) => unknown) => Result<T, E>
    unwrapOr: <const O>(value: O) => T | O
    unwrapOrFrom: <const O>(fn: (error: E) => O) => T | O
    dangerouslyUnwrap: () => T
    dangerouslyUnwrapErr: () => E
}

export interface Ok<T, E> extends $Result<T, E> {
    success: true
    value: T
}

export interface Err<T, E> extends $Result<T, E> {
    success: false
    error: E
}

export type Result<T, E> = Ok<T, E> | Err<T, E>

export const ok = <const T>(value: T): Ok<T, never> => {
    const self = () => ok(value)
    const extract = () => value

    return {
        async: false,
        success: true,
        value,
        map: (fn) => ok(fn(value)),
        mapErr: self,
        asyncMap: (fn) => fromSafePromise(fn(value)),
        bind: (fn) => fn(value),
        bindErr: self,
        asyncBind: (fn) => asyncFn(fn)(value),
        tap: (fn) => {
            syncCatchAndIgnore(() => fn(value))
            return ok(value)
        },
        tapErr: self,
        unwrapOr: extract,
        unwrapOrFrom: extract,
        dangerouslyUnwrap: extract,
        dangerouslyUnwrapErr: throwValueUnwrapError,
    }
}

export const err = <const E>(error: E): Err<never, E> => {
    const self = () => err(error)
    const asyncSelf = () => errAsync(error)
    const extract = () => error
    const apply = <const T>(fn: (error: E) => T): T => fn(error)

    return {
        async: false,
        success: false,
        error,
        map: self,
        mapErr: (fn) => err(fn(error)),
        asyncMap: asyncSelf,
        bind: self,
        bindErr: apply,
        asyncBind: asyncSelf,
        tap: self,
        tapErr: (fn) => {
            syncCatchAndIgnore(() => fn(error))
            return err(error)
        },
        unwrapOr: identity,
        unwrapOrFrom: apply,
        dangerouslyUnwrap: throwErrorUnwrapError,
        dangerouslyUnwrapErr: extract,
    }
}

export const syncFn =
    <A extends readonly unknown[], const T, const E>(fn: (...args: A) => Result<T, E>) =>
    (...args: A) =>
        fn(...args)

export const safeSyncFn =
    <A extends readonly unknown[], const T, const E, const HE>(
        fn: (...args: A) => Result<T, E>,
        errorHandler: (error: unknown) => HE,
    ) =>
    (...args: A): Result<T, E | HE> => {
        try {
            return fn(...args)
        } catch (error) {
            return err(errorHandler(error))
        }
    }

export const trySync = <const T>(fn: () => T): Result<T, unknown> => {
    try {
        return ok(fn())
    } catch (error) {
        return err(error)
    }
}

export const syncSafeguard =
    <A extends readonly unknown[], const T>(fn: (...args: A) => T) =>
    (...args: A): Result<T, unknown> =>
        trySync(() => fn(...args))

export const collapseSync = <const T, const E>(result: Result<T, E>): Result<T, E> => result

export const Result = {
    ok,
    err,
    fn: syncFn,
    safeFn: safeSyncFn,
    try: trySync,
    safeguard: syncSafeguard,
    collapse: collapseSync,
}
