import { asyncCatchAndIgnore, identity } from "./internal/utils"
import { err, ok, Result, trySync } from "./sync"

export type ResultAsync<T, E> = {
    async: true
    then: <const F, const R>(
        onFulfilled?: (value: Result<T, E>) => F | PromiseLike<F>,
        onRejected?: (error: unknown) => R | PromiseLike<R>,
    ) => Promise<F | R>
    map: <const M>(fn: (value: T) => M | Promise<M>) => ResultAsync<M, E>
    mapErr: <const M>(fn: (error: E) => M | Promise<M>) => ResultAsync<T, M>
    bind: <const BT, const BE>(
        fn: (value: T) => Result<BT, BE> | Promise<Result<BT, BE>> | ResultAsync<BT, BE>,
    ) => ResultAsync<BT, E | BE>
    bindErr: <const BT, const BE>(
        fn: (error: E) => Result<BT, BE> | Promise<Result<BT, BE>> | ResultAsync<BT, BE>,
    ) => ResultAsync<T | BT, BE>
    tap: (fn: (value: T) => unknown) => ResultAsync<T, E>
    tapErr: (fn: (error: E) => unknown) => ResultAsync<T, E>
    unwrapOr: <const O>(value: O) => Promise<T | O>
    unwrapOrFrom: <const O>(fn: (error: E) => O) => Promise<T | O>
    dangerouslyUnwrap: () => Promise<T>
    dangerouslyUnwrapErr: () => Promise<E>
}

export const fromResultPromise = <const T, const E, const HE>(
    promise: Promise<Result<T, E>>,
    errorHandler: (error: unknown) => HE,
): ResultAsync<T, E | HE> => {
    const handled = promise.catch((error: unknown) => err(errorHandler(error)))

    return {
        async: true,
        then: (onFulfilled, onRejected) => handled.then(onFulfilled, onRejected),
        map: (mapper) =>
            fromSafeResultPromise(
                handled.then(async (result) => (result.success ? ok(await mapper(result.value)) : err(result.error))),
            ),
        mapErr: (fn) =>
            fromSafeResultPromise(
                handled.then(async (result) => (result.success ? ok(result.value) : err(await fn(result.error)))),
            ),
        bind: (fn) =>
            fromSafeResultPromise(
                handled.then(async (result) => (result.success ? await fn(result.value) : err(result.error))),
            ),
        bindErr: (fn) =>
            fromSafeResultPromise(
                handled.then(async (result) => (result.success ? ok(result.value) : await fn(result.error))),
            ),
        tap: (fn) =>
            fromSafeResultPromise(
                handled.then(async (result) => {
                    if (!result.success) {
                        return err(result.error)
                    }

                    await asyncCatchAndIgnore(() => Promise.resolve(fn(result.value)))
                    return ok(result.value)
                }),
            ),
        tapErr: (fn) =>
            fromSafeResultPromise(
                handled.then(async (result) => {
                    if (result.success) {
                        return ok(result.value)
                    }

                    await asyncCatchAndIgnore(() => Promise.resolve(fn(result.error)))
                    return err(result.error)
                }),
            ),
        unwrapOr: (or) => handled.then((result) => result.unwrapOr(or)),
        unwrapOrFrom: (fn) => handled.then((result) => result.unwrapOrFrom(fn)),
        dangerouslyUnwrap: () => handled.then((result) => result.dangerouslyUnwrap()),
        dangerouslyUnwrapErr: () => handled.then((result) => result.dangerouslyUnwrapErr()),
    }
}

export const fromSafeResultPromise = <const T, const E>(promise: Promise<Result<T, E>>): ResultAsync<T, E> =>
    fromResultPromise(promise, (error) => {
        throw error
    })

export const okAsync = <const T>(value: T): ResultAsync<T, never> => fromSafeResultPromise(Promise.resolve(ok(value)))
export const errAsync = <const E>(error: E): ResultAsync<never, E> => fromSafeResultPromise(Promise.resolve(err(error)))

export const fromPromise = <const T, const E>(
    promise: Promise<T>,
    errorHandler: (error: unknown) => E | Promise<E>,
): ResultAsync<T, E> => {
    const handled = promise.then(ok).catch(async (error: unknown) => {
        const handledError: E = await errorHandler(error)
        return err(handledError)
    })

    return {
        async: true,
        then: (onFulfilled, onRejected) => handled.then(onFulfilled, onRejected),
        map: (fn) =>
            fromSafeResultPromise(
                handled.then(async (result) => (result.success ? ok(await fn(result.value)) : err(result.error))),
            ),
        mapErr: (fn) =>
            fromSafeResultPromise(
                handled.then(async (result) => (result.success ? ok(result.value) : err(await fn(result.error)))),
            ),
        bind: <const BT, const BE>(fn: (value: T) => Result<BT, BE> | Promise<Result<BT, BE>> | ResultAsync<BT, BE>) =>
            fromSafeResultPromise<BT, E | BE>(
                handled.then(async (result) => {
                    if (!result.success) {
                        return err(result.error)
                    }

                    const normalized = await fn(result.value)
                    return normalized
                }),
            ),
        bindErr: <const BT, const BE>(
            fn: (error: E) => Result<BT, BE> | Promise<Result<BT, BE>> | ResultAsync<BT, BE>,
        ) =>
            fromSafeResultPromise<T | BT, BE>(
                handled.then(async (result) => {
                    if (result.success) {
                        return ok(result.value)
                    }

                    const normalized = await fn(result.error)
                    return normalized
                }),
            ),
        tap: (fn) =>
            fromSafeResultPromise(
                handled.then(async (result) => {
                    if (!result.success) {
                        return err(result.error)
                    }

                    await asyncCatchAndIgnore(() => Promise.resolve(fn(result.value)))
                    return ok(result.value)
                }),
            ),
        tapErr: (fn) =>
            fromSafeResultPromise(
                handled.then(async (result) => {
                    if (result.success) {
                        return ok(result.value)
                    }

                    await asyncCatchAndIgnore(() => Promise.resolve(fn(result.error)))
                    return err(result.error)
                }),
            ),
        unwrapOr: (or) => handled.then((result) => result.unwrapOr(or)),
        unwrapOrFrom: (fn) => handled.then((result) => result.unwrapOrFrom(fn)),
        dangerouslyUnwrap: () => handled.then((result) => result.dangerouslyUnwrap()),
        dangerouslyUnwrapErr: () => handled.then((result) => result.dangerouslyUnwrapErr()),
    }
}

export const fromSafePromise = <const T, const E = never>(promise: Promise<T>): ResultAsync<T, E> =>
    fromPromise(promise, (error) => {
        throw error
    })
export const asyncFn =
    <A extends readonly unknown[], const T, const E>(
        fn: (...args: A) => Result<T, E> | Promise<Result<T, E>> | ResultAsync<T, E>,
    ) =>
    (...args: A) => {
        const result = fn(...args)

        if (result instanceof Promise) {
            return fromSafeResultPromise(result)
        } else if (result.async) {
            return result
        } else {
            return fromSafeResultPromise(Promise.resolve(result))
        }
    }

export const safeAsyncFn =
    <A extends readonly unknown[], const T, const E, const HE>(
        fn: (...args: A) => Result<T, E> | Promise<Result<T, E>> | ResultAsync<T, E>,
        errorHandler: (error: unknown) => HE,
    ) =>
    (...args: A): ResultAsync<T, E | HE> => {
        let result
        try {
            result = fn(...args)
        } catch (error) {
            return errAsync(errorHandler(error))
        }

        if (result instanceof Promise) {
            return fromResultPromise(result, errorHandler)
        } else if (result.async) {
            return result
        } else {
            return fromSafeResultPromise(Promise.resolve(result))
        }
    }

export const tryAsync = <const T>(fn: () => Promise<T>): ResultAsync<T, unknown> => {
    const promise = trySync(fn)
    if (!promise.success) {
        return errAsync(promise.error)
    }

    return fromPromise(promise.value, identity)
}

export const asyncSafeguard =
    <A extends readonly unknown[], const T>(fn: (...args: A) => Promise<T>) =>
    (...args: A): ResultAsync<T, unknown> =>
        tryAsync(() => fn(...args))

export const collapseAsync = <const T, const E>(result: ResultAsync<T, E>) => result

export const ResultAsync = {
    ok: okAsync,
    err: errAsync,
    fn: asyncFn,
    safeFn: safeAsyncFn,
    try: tryAsync,
    safeguard: asyncSafeguard,
    fromPromise,
    fromSafePromise,
    fromResultPromise,
    fromSafeResultPromise,
    collapse: collapseAsync,
}
