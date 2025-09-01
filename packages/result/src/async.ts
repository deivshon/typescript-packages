import { asyncCatchAndIgnore, identity } from "./internal/utils"
import { err, ok, Result } from "./sync"

export type ResultAsync<T, E> = {
    async: true
    then: <const F, const R>(
        onFulfilled?: (value: Result<T, E>) => F | PromiseLike<F>,
        onRejected?: (error: unknown) => R | PromiseLike<R>,
    ) => Promise<F | R>
    map: <const M>(mapper: (value: T) => M | Promise<M>) => ResultAsync<M, E>
    mapErr: <const M>(mapper: (error: E) => M | Promise<M>) => ResultAsync<T, M>
    bind: <const BT, const BE>(
        binder: (value: T) => Result<BT, BE> | Promise<Result<BT, BE>> | ResultAsync<BT, BE>,
    ) => ResultAsync<BT, E | BE>
    bindErr: <const BT, const BE>(
        binder: (error: E) => Result<BT, BE> | Promise<Result<BT, BE>> | ResultAsync<BT, BE>,
    ) => ResultAsync<T | BT, BE>
    tap: (effect: (value: T) => unknown) => ResultAsync<T, E>
    tapErr: (effect: (error: E) => unknown) => ResultAsync<T, E>
    through: <const EE>(
        effect: (value: T) => Result<unknown, EE> | Promise<Result<unknown, EE>> | ResultAsync<unknown, EE>,
    ) => ResultAsync<T, E | EE>
    unwrapOr: <const O>(value: O) => Promise<T | O>
    unwrapOrFrom: <const O>(from: (error: E) => O) => Promise<T | O>
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
        mapErr: (mapper) =>
            fromSafeResultPromise(
                handled.then(async (result) => (result.success ? ok(result.value) : err(await mapper(result.error)))),
            ),
        bind: (binder) =>
            fromSafeResultPromise(
                handled.then(async (result) => (result.success ? await binder(result.value) : err(result.error))),
            ),
        bindErr: (binder) =>
            fromSafeResultPromise(
                handled.then(async (result) => (result.success ? ok(result.value) : await binder(result.error))),
            ),
        tap: (effect) =>
            fromSafeResultPromise(
                handled.then(async (result) => {
                    if (!result.success) {
                        return err(result.error)
                    }

                    await asyncCatchAndIgnore(() => Promise.resolve(effect(result.value)))
                    return ok(result.value)
                }),
            ),
        tapErr: (effect) =>
            fromSafeResultPromise(
                handled.then(async (result) => {
                    if (result.success) {
                        return ok(result.value)
                    }

                    await asyncCatchAndIgnore(() => Promise.resolve(effect(result.error)))
                    return err(result.error)
                }),
            ),
        through: (effect) =>
            fromSafeResultPromise(
                handled.then(async (result) => {
                    if (!result.success) {
                        return err(result.error)
                    }

                    const effectResult = await effect(result.value)
                    return effectResult.success ? ok(result.value) : err(effectResult.error)
                }),
            ),
        unwrapOr: (or) => handled.then((result) => result.unwrapOr(or)),
        unwrapOrFrom: (from) => handled.then((result) => result.unwrapOrFrom(from)),
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
        map: (mapper) =>
            fromSafeResultPromise(
                handled.then(async (result) => (result.success ? ok(await mapper(result.value)) : err(result.error))),
            ),
        mapErr: (mapper) =>
            fromSafeResultPromise(
                handled.then(async (result) => (result.success ? ok(result.value) : err(await mapper(result.error)))),
            ),
        bind: <const BT, const BE>(
            binder: (value: T) => Result<BT, BE> | Promise<Result<BT, BE>> | ResultAsync<BT, BE>,
        ) =>
            fromSafeResultPromise<BT, E | BE>(
                handled.then(async (result) => {
                    if (!result.success) {
                        return err(result.error)
                    }

                    const normalized = await binder(result.value)
                    return normalized
                }),
            ),
        bindErr: <const BT, const BE>(
            binder: (error: E) => Result<BT, BE> | Promise<Result<BT, BE>> | ResultAsync<BT, BE>,
        ) =>
            fromSafeResultPromise<T | BT, BE>(
                handled.then(async (result) => {
                    if (result.success) {
                        return ok(result.value)
                    }

                    const normalized = await binder(result.error)
                    return normalized
                }),
            ),
        tap: (effect) =>
            fromSafeResultPromise(
                handled.then(async (result) => {
                    if (!result.success) {
                        return err(result.error)
                    }

                    await asyncCatchAndIgnore(() => Promise.resolve(effect(result.value)))
                    return ok(result.value)
                }),
            ),
        tapErr: (effect) =>
            fromSafeResultPromise(
                handled.then(async (result) => {
                    if (result.success) {
                        return ok(result.value)
                    }

                    await asyncCatchAndIgnore(() => Promise.resolve(effect(result.error)))
                    return err(result.error)
                }),
            ),
        through: <const EE>(
            effect: (value: T) => Result<unknown, EE> | Promise<Result<unknown, EE>> | ResultAsync<unknown, EE>,
        ) =>
            fromSafeResultPromise<T, E | EE>(
                handled.then(async (result) => {
                    if (!result.success) {
                        return err(result.error)
                    }

                    const effectResult = await effect(result.value)
                    return effectResult.success ? ok(result.value) : err(effectResult.error)
                }),
            ),
        unwrapOr: (or) => handled.then((result) => result.unwrapOr(or)),
        unwrapOrFrom: (from) => handled.then((result) => result.unwrapOrFrom(from)),
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

export const tryAsync = <const T>(fn: () => Promise<T>) => fromPromise(fn(), identity)

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
