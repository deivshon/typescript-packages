import { asyncFn, AsyncOption, fromOptionPromise, noneAsync } from "./async"
import { throwNoneOptionUnwrapError } from "./errors"
import { identity, syncCatchAndIgnore } from "./internal/utils"

export interface $Option<T> {
    async: false
    map: <const M>(fn: (value: T) => M) => Option<M>
    asyncMap: <const M>(fn: (value: T) => Promise<M>) => AsyncOption<M>
    bind: <const BT>(fn: (value: T) => Option<BT>) => Option<BT>
    asyncBind: <const BT>(fn: (value: T) => Promise<Option<BT>> | AsyncOption<BT>) => AsyncOption<BT>
    tap: (fn: (value: T) => unknown) => Option<T>
    unwrapOr: <const O>(value: O) => T | O
    dangerouslyUnwrap: () => T
}

export interface Some<T> extends $Option<T> {
    some: true
    value: T
}

export interface None<T> extends $Option<T> {
    some: false
}

export type Option<T> = Some<T> | None<T>

export const some = <const T>(value: T): Some<T> => {
    const extract = () => value

    return {
        async: false,
        some: true,
        value,
        map: (fn) => some(fn(value)),
        asyncMap: (fn) => fromOptionPromise(fn(value).then(some)),
        bind: (fn) => fn(value),
        asyncBind: (fn) => asyncFn(fn)(value),
        tap: (fn) => {
            syncCatchAndIgnore(() => {
                fn(value)
            })
            return some(value)
        },
        unwrapOr: extract,
        dangerouslyUnwrap: extract,
    }
}

export const none = (): None<never> => {
    const self = () => none()

    return {
        async: false,
        some: false,
        map: self,
        asyncMap: <const M>() => noneAsync<M>(),
        bind: self,
        asyncBind: <const BT>() => noneAsync<BT>(),
        tap: self,
        unwrapOr: identity,
        dangerouslyUnwrap: throwNoneOptionUnwrapError,
    }
}

export const Option = {
    some,
    none,
}
