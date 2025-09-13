import { throwNoneOptionUnwrapError } from "./errors"
import { asyncCatchAndIgnore } from "./internal/utils"
import { none, Option, some } from "./sync"

export type AsyncOption<T> = {
    async: true
    then: <const F, const R>(
        onFulfilled?: (value: Option<T>) => F | PromiseLike<F>,
        onRejected?: (error: unknown) => R | PromiseLike<R>,
    ) => Promise<F | R>
    map: <const M>(fn: (value: T) => M | Promise<M>) => AsyncOption<M>
    bind: <const BT>(fn: (value: T) => Option<BT> | Promise<Option<BT>> | AsyncOption<BT>) => AsyncOption<BT>
    tap: (fn: (value: T) => unknown) => AsyncOption<T>
    unwrapOr: <const O>(value: O) => Promise<T | O>
    dangerouslyUnwrap: () => Promise<T>
}

export const fromOptionPromise = <const T>(promise: Promise<Option<T>>): AsyncOption<T> => ({
    async: true,
    then: (onFulfilled, onRejected) => promise.then(onFulfilled, onRejected),
    map: (fn) =>
        fromOptionPromise(promise.then(async (option) => (option.some ? some(await fn(option.value)) : none()))),
    bind: (fn) => fromOptionPromise(promise.then((option) => (option.some ? fn(option.value) : none()))),
    tap: (fn) =>
        fromOptionPromise(
            promise.then(async (option) => {
                if (!option.some) {
                    return none()
                }

                await asyncCatchAndIgnore(() => {
                    const result = fn(option.value)
                    return result instanceof Promise ? result : Promise.resolve(result)
                })
                return some(option.value)
            }),
        ),
    unwrapOr: (or) => promise.then((option) => (option.some ? option.value : or)),
    dangerouslyUnwrap: () => promise.then((option) => (!option.some ? throwNoneOptionUnwrapError() : option.value)),
})

export const someAsync = <const T>(value: T): AsyncOption<T> => fromOptionPromise(Promise.resolve(some(value)))
export const noneAsync = <const T>(): AsyncOption<T> => fromOptionPromise(Promise.resolve(none()))

export const asyncFn =
    <A extends readonly unknown[], const T>(fn: (...args: A) => Option<T> | Promise<Option<T>> | AsyncOption<T>) =>
    (...args: A) => {
        const option = fn(...args)

        if (option instanceof Promise) {
            return fromOptionPromise(option)
        } else if (option.async) {
            return option
        } else {
            return fromOptionPromise(Promise.resolve(option))
        }
    }

export const AsyncOption = {
    someAsync,
    noneAsync,
    fn: asyncFn,
    fromOptionPromise,
}
