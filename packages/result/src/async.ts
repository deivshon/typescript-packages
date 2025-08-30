import { asyncCatchAndIgnore, identity } from "./internal/utils"
import { err, ok, Result } from "./sync"

export type ResultAsync<TValue, TError> = {
    async: true
    then: <const TFulfilled, const TRejected>(
        onFulfilled?: (value: Result<TValue, TError>) => TFulfilled | PromiseLike<TFulfilled>,
        onRejected?: (error: unknown) => TRejected | PromiseLike<TRejected>,
    ) => Promise<TFulfilled | TRejected>
    map: <const TMappedValue>(
        mapper: (value: TValue) => TMappedValue | Promise<TMappedValue>,
    ) => ResultAsync<TMappedValue, TError>
    mapErr: <const TMappedError>(
        mapper: (error: TError) => TMappedError | Promise<TMappedError>,
    ) => ResultAsync<TValue, TMappedError>
    bind: <const TBoundValue, const TBoundError>(
        binder: (
            value: TValue,
        ) =>
            | Result<TBoundValue, TBoundError>
            | Promise<Result<TBoundValue, TBoundError>>
            | ResultAsync<TBoundValue, TBoundError>,
    ) => ResultAsync<TBoundValue, TError | TBoundError>
    bindErr: <const TBoundValue, const TBoundError>(
        binder: (
            error: TError,
        ) =>
            | Result<TBoundValue, TBoundError>
            | Promise<Result<TBoundValue, TBoundError>>
            | ResultAsync<TBoundValue, TBoundError>,
    ) => ResultAsync<TValue | TBoundValue, TBoundError>
    tap: (effect: (value: TValue) => unknown) => ResultAsync<TValue, TError>
    tapErr: (effect: (error: TError) => unknown) => ResultAsync<TValue, TError>
    through: <const TEffectError>(
        effect: (
            value: TValue,
        ) =>
            | Result<unknown, TEffectError>
            | Promise<Result<unknown, TEffectError>>
            | ResultAsync<unknown, TEffectError>,
    ) => ResultAsync<TValue, TError | TEffectError>
    unwrapOr: <const TOr>(value: TOr) => Promise<TValue | TOr>
    unwrapOrFrom: <const TOr>(from: (error: TError) => TOr) => Promise<TValue | TOr>
    dangerouslyUnwrap: () => Promise<TValue>
    dangerouslyUnwrapErr: () => Promise<TError>
}

const fromResultPromise = <const TValue, const TError, const THandledError>(
    promise: Promise<Result<TValue, TError>>,
    errorHandler: (error: unknown) => THandledError,
): ResultAsync<TValue, TError | THandledError> => {
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

const fromSafeResultPromise = <const TValue, const TError>(
    promise: Promise<Result<TValue, TError>>,
): ResultAsync<TValue, TError> =>
    fromResultPromise(promise, (error) => {
        throw error
    })

export const okAsync = <const TValue, const TError = never>(value: TValue): ResultAsync<TValue, TError> =>
    fromSafeResultPromise(Promise.resolve(ok(value)))

export const errAsync = <const TError>(error: TError): ResultAsync<never, TError> =>
    fromSafeResultPromise(Promise.resolve(err(error)))

export const fromPromise = <const TValue, const TError>(
    promise: Promise<TValue>,
    errorHandler: (error: unknown) => TError | Promise<TError>,
): ResultAsync<TValue, TError> => {
    const handled = promise.then(ok).catch(async (error: unknown) => {
        const handledError: TError = await errorHandler(error)
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
        bind: <const TBoundValue, const TBoundError>(
            binder: (
                value: TValue,
            ) =>
                | Result<TBoundValue, TBoundError>
                | Promise<Result<TBoundValue, TBoundError>>
                | ResultAsync<TBoundValue, TBoundError>,
        ) =>
            fromSafeResultPromise<TBoundValue, TError | TBoundError>(
                handled.then(async (result) => {
                    if (!result.success) {
                        return err(result.error)
                    }

                    const normalized = await binder(result.value)
                    return normalized
                }),
            ),
        bindErr: <const TBoundValue, const TBoundError>(
            binder: (
                error: TError,
            ) =>
                | Result<TBoundValue, TBoundError>
                | Promise<Result<TBoundValue, TBoundError>>
                | ResultAsync<TBoundValue, TBoundError>,
        ) =>
            fromSafeResultPromise<TValue | TBoundValue, TBoundError>(
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
        through: <const TEffectError>(
            effect: (
                value: TValue,
            ) =>
                | Result<unknown, TEffectError>
                | Promise<Result<unknown, TEffectError>>
                | ResultAsync<unknown, TEffectError>,
        ) =>
            fromSafeResultPromise<TValue, TError | TEffectError>(
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

export const fromSafePromise = <const TValue, const TError = never>(
    promise: Promise<TValue>,
): ResultAsync<TValue, TError> =>
    fromPromise(promise, (error) => {
        throw error
    })
export const asyncFn =
    <TArgs extends readonly unknown[], const TValue, const TError>(
        fn: (...args: TArgs) => Result<TValue, TError> | Promise<Result<TValue, TError>> | ResultAsync<TValue, TError>,
    ) =>
    (...args: TArgs) => {
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
    <TArgs extends readonly unknown[], const TValue, const TError, const THandledError>(
        fn: (...args: TArgs) => Result<TValue, TError> | Promise<Result<TValue, TError>> | ResultAsync<TValue, TError>,
        errorHandler: (error: unknown) => THandledError,
    ) =>
    (...args: TArgs): ResultAsync<TValue, TError | THandledError> => {
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

export const tryAsync = <const TValue>(fn: () => Promise<TValue>) => fromPromise(fn(), identity)

export const asyncSafeguard =
    <TArgs extends readonly unknown[], const TValue>(fn: (...args: TArgs) => Promise<TValue>) =>
    (...args: TArgs): ResultAsync<TValue, unknown> =>
        tryAsync(() => fn(...args))

export const collapseAsync = <const TValue, const TError>(result: ResultAsync<TValue, TError>) => result

export const ResultAsync = {
    ok: okAsync,
    err: errAsync,
    fn: asyncFn,
    safeFn: safeAsyncFn,
    try: tryAsync,
    safeguard: asyncSafeguard,
    fromPromise,
    fromSafePromise,
    collapse: collapseAsync,
}
