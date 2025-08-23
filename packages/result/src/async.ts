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
        binder: (value: TValue) => Result<TBoundValue, TBoundError> | ResultAsync<TBoundValue, TBoundError>,
    ) => ResultAsync<TBoundValue, TError | TBoundError>
    bindErr: <const TBoundValue, const TBoundError>(
        binder: (
            error: TError,
        ) => Result<TValue | TBoundValue, TBoundError> | ResultAsync<TValue | TBoundValue, TBoundError>,
    ) => ResultAsync<TValue | TBoundValue, TBoundError>
    effect: (effect: (value: TValue) => unknown) => ResultAsync<TValue, TError>
    effectErr: (effect: (error: TError) => unknown) => ResultAsync<TValue, TError>
    unwrapOr: <const TOr>(value: TOr) => Promise<TValue | TOr>
    unwrapErrOr<const TOr>(value: TOr): Promise<TError | TOr>
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
            return mapped instanceof Promise ? fromSafeValuePromise(mapped) : okAsync(mapped)
        },
        mapErr: self,
        bind: (binder) => {
            const bound = binder(value)
            return bound.async ? bound : bound.success ? okAsync(bound.value) : errAsync(bound.error)
        },
        bindErr: self,
        effect: (effect) => tap(value, effect, okAsync),
        effectErr: self,
        unwrapOr: extract,
        unwrapErrOr: (or) => Promise.resolve(or),
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
        bindErr: (binder) => {
            const bound = binder(error)
            return bound.async ? bound : bound.success ? okAsync(bound.value) : errAsync(bound.error)
        },
        effect: self,
        effectErr: (effect) => tap(error, effect, errAsync),
        unwrapOr: (or) => Promise.resolve(or),
        unwrapErrOr: extract,
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
        binder: (value: TValue) => Result<TBoundValue, TBoundError> | ResultAsync<TBoundValue, TBoundError>,
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
        ) => Result<TValue | TBoundValue, TBoundError> | ResultAsync<TValue | TBoundValue, TBoundError>,
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
    effect: (effect) =>
        fromPromise(
            promise.then((value) => tap(value, effect, identity)),
            errorHandler,
        ),
    effectErr: (effect) => fromPromise(promise, async (error) => tap(await errorHandler(error), effect, identity)),
    unwrapOr: (or) => promise.catch(() => or),
    unwrapErrOr: (or) => promise.then(() => or).catch(errorHandler),
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

export const fromSafeValuePromise = <const TValue, const TError = never>(
    valuePromise: Promise<TValue>,
): ResultAsync<TValue, TError> =>
    fromPromise(valuePromise, (error) => {
        throw error
    })

const fromSafeErrorPromise = <const TError, const TValue = never>(
    errorPromise: Promise<TError>,
): ResultAsync<TValue, TError> => fromPromise(Promise.reject(new Error()), () => errorPromise)

export const fromSafeResultPromise = <const TValue, const TError>(
    resultPromise: Promise<Result<TValue, TError>> | (() => Promise<Result<TValue, TError>>),
): ResultAsync<TValue, TError> => {
    const [createResultError, isResultError] = anonymousError<TError>()

    return fromPromise(
        (resultPromise instanceof Function ? resultPromise() : resultPromise).then((result) => {
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
                throw error
            }
        },
    )
}

export const tryAsync = <const TReturn>(fn: () => Promise<TReturn>) => fromPromise(fn(), (error) => error)

export const safeguardAsync =
    <TArgs extends readonly unknown[], const TReturn>(fn: (...args: TArgs) => Promise<TReturn>) =>
    (...args: TArgs): ResultAsync<TReturn, unknown> =>
        tryAsync(() => fn(...args))

export const ResultAsync = {
    ok: okAsync,
    err: errAsync,
    try: tryAsync,
    safeguard: safeguardAsync,
    fromPromise,
    fromSafePromise: fromSafeValuePromise,
    fromSafeResultPromise,
}
