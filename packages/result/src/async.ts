import { rejectWithErrorUnwrapError, rejectWithValueUnwrapError, throwValueUnwrapError, UnwrapError } from "./errors"
import { tap } from "./internal/effects"
import { anonymousError, identity } from "./internal/values"
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

export const okAsync = <const TValue, const TError = never>(value: TValue): ResultAsync<TValue, TError> => {
    const self = () => okAsync(value)
    const extract = () => Promise.resolve(value)

    return {
        async: true,
        then: (onFulfilled, onRejected) => Promise.resolve(ok(value)).then(onFulfilled, onRejected),
        map: (mapper) => {
            const mapped = mapper(value)
            return mapped instanceof Promise ? fromSafePromise(mapped) : okAsync(mapped)
        },
        mapErr: self,
        bind: (binder) => asyncFn(binder)(value),
        bindErr: self,
        tap: (effect) => tap(value, effect, () => value, okAsync),
        tapErr: self,
        through: (effect) => asyncFn(effect)(value).map(() => value),
        unwrapOr: extract,
        unwrapOrFrom: extract,
        dangerouslyUnwrap: extract,
        dangerouslyUnwrapErr: rejectWithErrorUnwrapError,
    }
}

export const errAsync = <const TError, const TValue = never>(error: TError): ResultAsync<TValue, TError> => {
    const self = () => errAsync(error)
    const extract = () => Promise.resolve(error)

    return {
        async: true,
        then: (onFulfilled, onRejected) => Promise.resolve(err(error)).then(onFulfilled, onRejected),
        map: self,
        mapErr: (mapper) => {
            const mapped = mapper(error)
            return mapped instanceof Promise ? fromSafeErrorPromise(mapped) : errAsync(mapped)
        },
        bind: self,
        bindErr: (binder) => asyncFn(binder)(error),
        tap: self,
        tapErr: (effect) => tap(error, effect, () => error, errAsync),
        through: self,
        unwrapOr: (or) => Promise.resolve(or),
        unwrapOrFrom: (from) => Promise.resolve(from(error)),
        dangerouslyUnwrap: rejectWithValueUnwrapError,
        dangerouslyUnwrapErr: extract,
    }
}

export const fromPromise = <const TValue, const TError>(
    promise: Promise<TValue>,
    errorHandler: (error: unknown) => TError | Promise<TError>,
): ResultAsync<TValue, TError> => ({
    async: true,
    then: (onFulfilled, onRejected) =>
        promise
            .then(ok)
            .catch(async (error: unknown) => err(await errorHandler(error)))
            .then(onFulfilled, onRejected),
    map: (mapper) =>
        fromPromise(
            promise.then(async (value) => await mapper(value)),
            errorHandler,
        ),
    mapErr: (mapper) => fromPromise(promise, async (error) => await mapper(await errorHandler(error))),
    bind: <const TBoundValue, const TBoundError>(
        binder: (
            value: TValue,
        ) =>
            | Result<TBoundValue, TBoundError>
            | Promise<Result<TBoundValue, TBoundError>>
            | ResultAsync<TBoundValue, TBoundError>,
    ) => {
        const [createBoundError, isBoundError] = anonymousError<TBoundError>()

        return fromPromise<TBoundValue, TError | TBoundError>(
            promise.then(async (value) => {
                const bound = await binder(value)
                if (bound.success) {
                    return bound.value
                } else {
                    throw createBoundError(bound.error)
                }
            }),
            (error) => (isBoundError(error) ? error.value : errorHandler(error)),
        )
    },
    bindErr: <const TBoundValue, const TBoundError>(
        binder: (
            error: TError,
        ) =>
            | Result<TBoundValue, TBoundError>
            | Promise<Result<TBoundValue, TBoundError>>
            | ResultAsync<TBoundValue, TBoundError>,
    ) => {
        const [createBoundError, isBoundError] = anonymousError<TBoundError>()

        return fromPromise<TValue | TBoundValue, TBoundError>(
            promise.catch(async (error: unknown) => {
                const bound = await binder(await errorHandler(error))
                if (bound.success) {
                    return bound.value
                } else {
                    throw createBoundError(bound.error)
                }
            }),
            (error) => {
                if (isBoundError(error)) {
                    return error.value
                } else {
                    throw error
                }
            },
        )
    },
    tap: (effect) =>
        fromPromise(
            promise.then((value) => tap(value, effect, () => value, identity)),
            errorHandler,
        ),
    tapErr: (effect) =>
        fromPromise(promise, async (error) => {
            const normalized = await errorHandler(error)
            return tap(normalized, effect, () => normalized, identity)
        }),
    through: <const TEffectError>(
        effect: (
            value: TValue,
        ) =>
            | Result<unknown, TEffectError>
            | Promise<Result<unknown, TEffectError>>
            | ResultAsync<unknown, TEffectError>,
    ) => {
        const [createEffectError, isEffectError] = anonymousError<TEffectError>()

        return fromPromise(
            promise.then(async (value) => {
                const result = await effect(value)
                if (result.success) {
                    return value
                } else {
                    throw createEffectError(result.error)
                }
            }),
            async (error) => (isEffectError(error) ? error.value : errorHandler(error)),
        )
    },
    unwrapOr: (or) => promise.catch(() => or),
    unwrapOrFrom: (from) => promise.catch(from),
    dangerouslyUnwrap: () => promise.catch(throwValueUnwrapError),
    dangerouslyUnwrapErr: async () => {
        const [createThenError, isThenError] = anonymousError<UnwrapError>()

        try {
            void (await promise)
            throw createThenError(new UnwrapError("error"))
        } catch (error) {
            if (isThenError(error)) {
                throw error.value
            } else {
                return errorHandler(error)
            }
        }
    },
})

export const fromSafePromise = <const TValue, const TError = never>(
    promise: Promise<TValue>,
): ResultAsync<TValue, TError> =>
    fromPromise(promise, (error) => {
        throw error
    })

const fromSafeErrorPromise = <const TError, const TValue = never>(
    promise: Promise<TError>,
): ResultAsync<TValue, TError> => fromPromise(Promise.reject(new Error()), () => promise)

const fromResultPromise = <const TValue, const TError, const THandledError>(
    promise: Promise<Result<TValue, TError>>,
    errorHandler: (error: unknown) => THandledError,
): ResultAsync<TValue, TError | THandledError> => {
    const [createResultError, isResultError] = anonymousError<TError>()

    return fromPromise(
        promise.then((result) => {
            if (result.success) {
                return result.value
            } else {
                throw createResultError(result.error)
            }
        }),
        (error) => {
            if (isResultError(error)) {
                return error.value
            } else {
                return errorHandler(error)
            }
        },
    )
}

const fromSafeResultPromise = <const TValue, const TError>(
    promise: Promise<Result<TValue, TError>>,
): ResultAsync<TValue, TError> =>
    fromResultPromise(promise, (error) => {
        throw error
    })

export const fromSyncResult = <const TValue, const TError>(
    result: Result<TValue, TError>,
): ResultAsync<TValue, TError> => (result.success ? okAsync(result.value) : errAsync(result.error))

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
            return fromSyncResult(result)
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
            return fromSyncResult(result)
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
    fromSync: fromSyncResult,
    collapse: collapseAsync,
}
