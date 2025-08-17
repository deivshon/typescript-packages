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
    unwrapOr: <const TOr>(value: TOr) => TValue | TOr
    map: <const TMappedValue>(mapper: (value: TValue) => TMappedValue) => Result<TMappedValue, TError>
    mapErr: <const TMappedError>(mapper: (error: TError) => TMappedError) => Result<TValue, TMappedError>
    bind: <const TBoundValue, const TBoundError>(
        binder: (value: TValue) => Result<TBoundValue, TBoundError>,
    ) => Result<TBoundValue, TError | TBoundError>
    asyncBind: <const TBoundValue, const TBoundError>(
        asyncBinder: (value: TValue) => ResultAsync<TBoundValue, TError | TBoundError>,
    ) => ResultAsync<TBoundValue, TError | TBoundError>
}

export const ok = <const TValue, const TError = never>(value: TValue): Result<TValue, TError> => ({
    async: false,
    success: true,
    value,
    map: <const TMappedValue>(mapper: (value: TValue) => TMappedValue) => ok(mapper(value)),
    mapErr: <const TMappedError>(_: (_: TError) => TMappedError) => ok<TValue, TMappedError>(value),
    unwrapOr: <const TOr>(_: TOr) => value,
    bind: <const TBoundValue, const TBoundError>(binder: (value: TValue) => Result<TBoundValue, TBoundError>) =>
        binder(value),
    asyncBind: <const TBoundValue, const TBoundError>(
        asyncBinder: (value: TValue) => ResultAsync<TBoundValue, TError | TBoundError>,
    ) => asyncBinder(value),
})

export const err = <const TError, const TValue = never>(error: TError): Result<TValue, TError> => ({
    async: false,
    success: false,
    error,
    unwrapOr: <const TOr>(or: TOr) => or,
    map: <const TMappedValue>(_: (_: TValue) => TMappedValue) => err<TError, TMappedValue>(error),
    mapErr: <const TMappedError>(mapper: (error: TError) => TMappedError) => err(mapper(error)),
    bind: <const TBoundValue, const TBoundError>(_: (_: TValue) => Result<TBoundValue, TBoundError>) =>
        err<TError | TBoundError, TBoundValue>(error),
    asyncBind: <const TBoundValue, const TBoundError>(
        _: (_: TValue) => ResultAsync<TBoundValue, TError | TBoundError>,
    ) => errAsync<TError | TBoundError, TBoundValue>(error),
})

export const result = {
    ok,
    err,
}

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
    ) =>
        new Promise<Result<TValue, TError>>((resolve) => {
            resolve(ok(value))
        }).then(onFulfilled, onRejected),
    unwrapOr: <const TOr>(_: TOr) => Promise.resolve(value),
    map: <const TMappedValue>(mapper: (value: TValue) => TMappedValue | Promise<TMappedValue>) => {
        const mapped = mapper(value)
        return mapped instanceof Promise ? fromSafeValuePromise(mapped) : okAsync<TMappedValue, TError>(mapped)
    },
    mapErr: <const TMappedError>(_: (_: TError) => TMappedError | Promise<TMappedError>) =>
        okAsync<TValue, TMappedError>(value),
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
    ) =>
        new Promise<Result<TValue, TError>>((resolve) => {
            resolve(err(error))
        }).then(onFulfilled, onRejected),
    unwrapOr: <const TOr>(or: TOr) => Promise.resolve(or),
    map: <const TMappedValue>(_: (_: TValue) => TMappedValue | Promise<TMappedValue>) =>
        errAsync<TError, TMappedValue>(error),
    mapErr: <const TMappedError>(mapper: (error: TError) => TMappedError | Promise<TMappedError>) => {
        const mapped = mapper(error)
        return mapped instanceof Promise ? fromSafeErrorPromise<TMappedError, TValue>(mapped) : errAsync(mapped)
    },
    bind: <const TBoundValue, const TBoundError>(
        _: (_: TValue) => Result<TBoundValue, TBoundError> | ResultAsync<TBoundValue, TBoundError>,
    ) => errAsync<TError | TBoundError, TBoundValue>(error),
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
            .then((value) => ok<TValue, TError>(value))
            .catch(async (error: unknown) => err<TError, TValue>(await errorHandler(error)))
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
        const [createBoundError, isBoundError] = brandedError<TBoundError>("")

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

const fromSafeValuePromise = <const TValue, const TError>(
    valuePromise: Promise<TValue>,
): ResultAsync<TValue, TError> => ({
    async: true,
    then: <const TFulfilled, const TRejected>(
        onFulfilled?: (value: Result<TValue, TError>) => TFulfilled | PromiseLike<TFulfilled>,
        onRejected?: (error: unknown) => TRejected | PromiseLike<TRejected>,
    ) => valuePromise.then((value) => ok<TValue, TError>(value)).then(onFulfilled, onRejected),
    unwrapOr: <const TOr>(_: TOr) => valuePromise.then<TValue | TOr>((value) => value),
    map: <const TMappedValue>(mapper: (value: TValue) => TMappedValue | Promise<TMappedValue>) =>
        fromSafeValuePromise<TMappedValue, TError>(valuePromise.then(async (value) => await mapper(value))),
    mapErr: <const TMappedError>(_: (_: TError) => TMappedError | Promise<TMappedError>) =>
        fromSafeValuePromise<TValue, TMappedError>(valuePromise),
    bind: <const TBoundValue, const TBoundError>(
        binder: (value: TValue) => Result<TBoundValue, TBoundError> | ResultAsync<TBoundValue, TBoundError>,
    ) => {
        const [createBoundError, isBoundError] = brandedError<TBoundError>("")

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

export const fromSafeErrorPromise = <const TError, const TValue = never>(
    errorPromise: Promise<TError>,
): ResultAsync<TValue, TError> => ({
    async: true,
    then: <const TFulfilled, const TRejected>(
        onFulfilled?: (value: Result<TValue, TError>) => TFulfilled | PromiseLike<TFulfilled>,
        onRejected?: (error: unknown) => TRejected | PromiseLike<TRejected>,
    ) => errorPromise.then((error) => err<TError, TValue>(error)).then(onFulfilled, onRejected),
    unwrapOr: <const TOr>(or: TOr) => Promise.resolve(or),
    map: <const TMappedValue>(_: (_: TValue) => TMappedValue | Promise<TMappedValue>) =>
        fromSafeErrorPromise<TError, TMappedValue>(errorPromise),
    mapErr: <const TMappedError>(mapper: (error: TError) => TMappedError | Promise<TMappedError>) =>
        fromSafeErrorPromise<TMappedError, TValue>(errorPromise.then(async (error) => await mapper(error))),
    bind: <const TBoundValue, const TBoundError>(
        _: (_: TValue) => Result<TBoundValue, TBoundError> | ResultAsync<TBoundValue, TBoundError>,
    ) => fromSafeErrorPromise<TError | TBoundError, TBoundValue>(errorPromise),
})

export const fromAsyncFn =
    <const TArgs extends readonly unknown[], TReturn>(fn: (...args: TArgs) => Promise<TReturn>) =>
    (...args: TArgs): ResultAsync<TReturn, unknown> =>
        fromPromise(fn(...args), (error) => error)

export const fromResultPromise = <const TValue, const TError>(
    resultPromise: Promise<Result<TValue, TError>>,
): ResultAsync<TValue, TError> => {
    const [createResultError, isResultError] = brandedError<TError>("")

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
export const fromAsyncResultFn =
    <const TArgs extends readonly unknown[], const TValue, const TError>(
        asyncFn: (...args: TArgs) => Promise<Result<TValue, TError>>,
    ) =>
    (...args: TArgs): ResultAsync<TValue, TError> =>
        fromResultPromise(asyncFn(...args))

export const resultAsync = {
    ok: okAsync,
    err: errAsync,
    fromPromise,
    fromFn: fromAsyncFn,
    fromSafePromise: fromSafeValuePromise,
    fromResultPromise,
    fromResultFn: fromAsyncResultFn,
}

const brandedError = <T>(name: string) => {
    class BrandedError extends globalThis.Error {
        name = name
        value: T

        constructor(value: T, message: string) {
            super(message)
            this.value = value
        }
    }

    return [
        (value: T, message: string) => new BrandedError(value, message),
        (value: unknown): value is BrandedError => value instanceof BrandedError,
    ] as const
}
