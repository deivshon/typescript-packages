import { NoFunctions } from "./helper"

export type Store<TState extends Record<string, unknown>, TDerived extends Record<string, unknown>> = {
    get: () => Readonly<TState & TDerived>
    set: (
        update: Partial<NoFunctions<TState>> | ((prev: Readonly<TState & TDerived>) => Partial<NoFunctions<TState>>),
    ) => void
    subscribe: (callback: (state: Readonly<TState & TDerived>) => void) => () => void
}

export type Middleware<TState extends Record<string, unknown>> = {
    transformInitial?: (state: TState) => TState
    onInit?: (state: TState) => void
    transformUpdate?: (update: Partial<NoFunctions<TState>>) => Partial<NoFunctions<TState>>
    onUpdate?: (update: Partial<NoFunctions<TState>>, updated: TState) => void
}

export const createStoreWithDerived = <
    TState extends Record<string, unknown>,
    TDerived extends Record<string, unknown>,
>(
    initial: (set: Store<TState, TDerived>["set"]) => TState,
    derive: (state: TState) => TDerived,
    middlewares: Array<Middleware<TState>> = [],
): Store<TState, TDerived> => {
    let state: TState
    let derived: TDerived
    let data: TState & TDerived

    const listeners = new Set<(state: Readonly<TState & TDerived>) => void>()
    const subscribe: Store<TState, TDerived>["subscribe"] = (callback) => {
        listeners.add(callback)

        return () => {
            listeners.delete(callback)
        }
    }

    const get: Store<TState, TDerived>["get"] = () => data
    const set: Store<TState, TDerived>["set"] = (rawUpdate) => {
        const update = (() => {
            const base = rawUpdate instanceof Function ? rawUpdate(data) : rawUpdate

            let processed = base
            for (const { transformUpdate } of middlewares) {
                if (!transformUpdate) {
                    continue
                }

                processed = transformUpdate(processed)
            }

            return processed
        })()
        if (Object.is(update, state)) {
            return
        }

        state = {
            ...state,
            ...update,
        }
        derived = derive(state)
        data = {
            ...state,
            ...derived,
        }

        for (const { onUpdate } of middlewares) {
            if (!onUpdate) {
                continue
            }

            onUpdate(update, state)
        }

        for (const listenerFn of listeners) {
            listenerFn(data)
        }
    }

    state = (() => {
        const base = initial(set)

        let processed = base
        for (const { transformInitial } of middlewares) {
            if (!transformInitial) {
                continue
            }

            processed = transformInitial(processed)
        }

        return processed
    })()
    derived = derive(state)
    data = {
        ...state,
        ...derived,
    }
    for (const { onInit } of middlewares) {
        if (!onInit) {
            continue
        }

        onInit(state)
    }

    return {
        get,
        set,
        subscribe,
    }
}

export const createStore = <TState extends Record<string, unknown>>(
    initial: (set: Store<TState, Record<never, never>>["set"]) => TState,
    middlewares: Array<Middleware<TState>> = [],
) => createStoreWithDerived<TState, Record<never, never>>(initial, () => ({}), middlewares)
