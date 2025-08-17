import { brandedError } from "./internal/branded-error"
import { Result, err, ok } from "./sync"

export type ResultAsync<TValue, TError> = {
    async: true
    then: <const TFulfilled, const TRejected>(
        onFulfilled?: (value: Result<TValue, TError>) => TFulfilled | PromiseLike<TFulfilled>,
        onRejected?: (error: unknown) => TRejected | PromiseLike<TRejected>,
    ) => Promise<TFulfilled | TRejected>
    unwrapOr: <const TOr>(value: TOr) => Promise<TValue | TOr>
    map: <const TMappedValue>(
        mapper: (value: TValue) => TMappedValue | Promise<TMappedValue>,
    ) => ResultAsync<TMappedValue, TError>
    mapErr: <const TMappedError>(
        mapper: (error: TError) => TMappedError | Promise<TMappedError>,
    ) => ResultAsync<TValue, TMappedError>
    bind: <const TBoundValue, const TBoundError>(
        binder: (value: TValue) => Result<TBoundValue, TBoundError> | ResultAsync<TBoundValue, TBoundError>,
    ) => ResultAsync<TBoundValue, TError | TBoundError>
}

export const okAsync = <const TValue, const TError = never>(value: TValue): ResultAsync<TValue, TError> => ({
    async: true,
    then: <const TFulfilled, const TRejected>(
        onFulfilled?: (value: Result<TValue, TError>) => TFulfilled | PromiseLike<TFulfilled>,
        onRejected?: (error: unknown) => TRejected | PromiseLike<TRejected>,
    ) => Promise.resolve<Result<TValue, TError>>(ok(value)).then(onFulfilled, onRejected),
    unwrapOr: () => Promise.resolve(value),
    map: <const TMappedValue>(mapper: (value: TValue) => TMappedValue | Promise<TMappedValue>) => {
        const mapped = mapper(value)
        return mapped instanceof Promise
            ? fromSafeValuePromise<TMappedValue, TError>(mapped)
            : okAsync<TMappedValue, TError>(mapped)
    },
    mapErr: <const TMappedError>() => okAsync<TValue, TMappedError>(value),
    bind: <const TBoundValue, const TBoundError>(
        binder: (value: TValue) => Result<TBoundValue, TBoundError> | ResultAsync<TBoundValue, TBoundError>,
    ) => {
        const bound = binder(value)
        return bound.async
            ? bound
            : bound.success
              ? okAsync<TBoundValue, TBoundError>(bound.value)
              : errAsync<TBoundError, TBoundValue>(bound.error)
    },
})

export const errAsync = <const TError, const TValue = never>(error: TError): ResultAsync<TValue, TError> => ({
    async: true,
    then: <const TFulfilled, const TRejected>(
        onFulfilled?: (value: Result<TValue, TError>) => TFulfilled | PromiseLike<TFulfilled>,
        onRejected?: (error: unknown) => TRejected | PromiseLike<TRejected>,
    ) => Promise.resolve<Result<TValue, TError>>(err(error)).then(onFulfilled, onRejected),
    unwrapOr: <const TOr>(or: TOr) => Promise.resolve(or),
    map: <const TMappedValue>() => errAsync<TError, TMappedValue>(error),
    mapErr: <const TMappedError>(mapper: (error: TError) => TMappedError | Promise<TMappedError>) => {
        const mapped = mapper(error)
        return mapped instanceof Promise ? fromSafeErrorPromise<TMappedError, TValue>(mapped) : errAsync(mapped)
    },
    bind: <const TBoundValue, const TBoundError>() => errAsync<TError | TBoundError, TBoundValue>(error),
})

export const fromPromise = <const TValue, const TError>(
    promise: Promise<TValue>,
    errorHandler: (error: unknown) => TError | Promise<TError>,
): ResultAsync<TValue, TError> => ({
    async: true,
    then: <const TFulfilled, const TRejected>(
        onFulfilled?: (value: Result<TValue, TError>) => TFulfilled | PromiseLike<TFulfilled>,
        onRejected?: (error: unknown) => TRejected | PromiseLike<TRejected>,
    ) =>
        promise
            .then<Result<TValue, TError>>((value) => ok(value))
            .catch<Result<TValue, TError>>(async (error: unknown) => err(await errorHandler(error)))
            .then(onFulfilled, onRejected),
    unwrapOr: <const TOr>(or: TOr) => promise.then((value) => value).catch(() => or),
    map: <const TMappedValue>(mapper: (value: TValue) => TMappedValue | Promise<TMappedValue>) =>
        fromPromise<TMappedValue, TError>(
            promise.then(async (value) => await mapper(value)),
            errorHandler,
        ),
    mapErr: <const TMappedError>(mapper: (error: TError) => TMappedError | Promise<TMappedError>) =>
        fromPromise<TValue, TMappedError>(promise, async (error) => await mapper(await errorHandler(error))),
    bind: <const TBoundValue, const TBoundError>(
        binder: (value: TValue) => Result<TBoundValue, TBoundError> | ResultAsync<TBoundValue, TBoundError>,
    ) => {
        const [createBoundError, isBoundError] = brandedError<TBoundError>()

        return fromPromise<TBoundValue, TError | TBoundError>(
            promise.then(async (value) => {
                const bound = await binder(value)
                if (bound.success) {
                    return bound.value
                } else {
                    throw createBoundError(bound.error, "")
                }
            }),
            (error) => (isBoundError(error) ? error.value : errorHandler(error)),
        )
    },
})

export const fromSafeValuePromise = <const TValue, const TError>(
    valuePromise: Promise<TValue>,
): ResultAsync<TValue, TError> => ({
    async: true,
    then: <const TFulfilled, const TRejected>(
        onFulfilled?: (value: Result<TValue, TError>) => TFulfilled | PromiseLike<TFulfilled>,
        onRejected?: (error: unknown) => TRejected | PromiseLike<TRejected>,
    ) => valuePromise.then<Result<TValue, TError>>((value) => ok(value)).then(onFulfilled, onRejected),
    unwrapOr: () => valuePromise,
    map: <const TMappedValue>(mapper: (value: TValue) => TMappedValue | Promise<TMappedValue>) =>
        fromSafeValuePromise<TMappedValue, TError>(valuePromise.then(async (value) => await mapper(value))),
    mapErr: <const TMappedError>() => fromSafeValuePromise<TValue, TMappedError>(valuePromise),
    bind: <const TBoundValue, const TBoundError>(
        binder: (value: TValue) => Result<TBoundValue, TBoundError> | ResultAsync<TBoundValue, TBoundError>,
    ) => {
        const [createBoundError, isBoundError] = brandedError<TBoundError>()

        return fromPromise<TBoundValue, TError | TBoundError>(
            valuePromise.then(async (value) => {
                const bound = await binder(value)
                if (bound.success) {
                    return bound.value
                } else {
                    throw createBoundError(bound.error, "")
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
})

const fromSafeErrorPromise = <const TError, const TValue = never>(
    errorPromise: Promise<TError>,
): ResultAsync<TValue, TError> => ({
    async: true,
    then: <const TFulfilled, const TRejected>(
        onFulfilled?: (value: Result<TValue, TError>) => TFulfilled | PromiseLike<TFulfilled>,
        onRejected?: (error: unknown) => TRejected | PromiseLike<TRejected>,
    ) => errorPromise.then((error) => err<TError, TValue>(error)).then(onFulfilled, onRejected),
    unwrapOr: <const TOr>(or: TOr) => Promise.resolve(or),
    map: <const TMappedValue>() => fromSafeErrorPromise<TError, TMappedValue>(errorPromise),
    mapErr: <const TMappedError>(mapper: (error: TError) => TMappedError | Promise<TMappedError>) =>
        fromSafeErrorPromise<TMappedError, TValue>(errorPromise.then(async (error) => await mapper(error))),
    bind: <const TBoundValue, const TBoundError>() =>
        fromSafeErrorPromise<TError | TBoundError, TBoundValue>(errorPromise),
})

export const fromSafeResultPromise = <const TValue, const TError>(
    resultPromise: Promise<Result<TValue, TError>>,
): ResultAsync<TValue, TError> => {
    const [createResultError, isResultError] = brandedError<TError>()

    return fromPromise(
        resultPromise.then((result) => {
            if (result.success) {
                return result.value
            } else {
                throw createResultError(result.error, "")
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
export const fromSafeAsyncResultFn =
    <TArgs extends readonly unknown[], const TValue, const TError>(
        asyncFn: (...args: TArgs) => Promise<Result<TValue, TError>>,
    ) =>
    (...args: TArgs): ResultAsync<TValue, TError> =>
        fromSafeResultPromise(asyncFn(...args))

export const tryAsync = <const TReturn>(fn: () => Promise<TReturn>) => fromPromise(fn(), (error) => error)

export const safeguardAsync =
    <TArgs extends readonly unknown[], const TReturn>(fn: (...args: TArgs) => Promise<TReturn>) =>
    (...args: TArgs): ResultAsync<TReturn, unknown> =>
        tryAsync(() => fn(...args))

export const resultAsync = {
    ok: okAsync,
    err: errAsync,
    try: tryAsync,
    safeguard: safeguardAsync,
    fromPromise,
    fromSafePromise: fromSafeValuePromise,
    fromSafeResultPromise,
    fromSafeResultFn: fromSafeAsyncResultFn,
}
