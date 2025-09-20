export const id = Symbol.for("@deivshon/store.Store.id")
export const iteration = Symbol.for("@deivshon/store.Store.iteration")

type $Contents<TState extends Record<string, unknown>, TDerived extends Record<string, unknown>> = TState &
    TDerived & {
        readonly [id]: Record<PropertyKey, never>
        readonly [iteration]: Record<PropertyKey, never>
    }

export type Store<
    TState extends Record<string, unknown>,
    TDerived extends Record<string, unknown> = Record<never, never>,
> = {
    readonly [id]: Record<PropertyKey, never>
    readonly get: () => Readonly<$Contents<TState, TDerived>>
    readonly set: (
        update: Partial<TState> | ((prev: Readonly<$Contents<TState, TDerived>>) => Partial<TState>),
        meta?: Partial<Record<symbol, unknown>>,
    ) => void
    readonly subscribe: (callback: (state: Readonly<$Contents<TState, TDerived>>) => void) => () => void
}
export type Contents<
    TState extends Record<string, unknown>,
    TDerived extends Record<string, unknown> = Record<never, never>,
> = ReturnType<Store<TState, TDerived>["get"]>

export type Middleware<TState extends Record<string, unknown>> = {
    readonly transformInitial?: (state: Readonly<TState>) => TState
    readonly onInit?: (state: Readonly<TState>, set: Store<TState, Record<string, unknown>>["set"]) => void
    readonly transformUpdate?: (
        update: Readonly<Partial<TState>>,
        meta: Partial<Record<symbol, unknown>>,
    ) => Partial<TState>
    readonly onUpdate?: (
        update: Readonly<Partial<TState>>,
        newState: Readonly<TState>,
        meta: Partial<Record<symbol, unknown>>,
    ) => void
    readonly onDestroy?: () => void
}

export const createStoreWithDerived = <
    TState extends Record<string, unknown>,
    TDerived extends Record<string, unknown>,
>(
    initial: (set: Store<TState, TDerived>["set"]) => TState,
    derive: (state: TState) => TDerived,
    middleware: Array<Middleware<TState>> = [],
): Store<TState, TDerived> => {
    let state: TState
    let derived: TDerived
    let contents: Contents<TState, TDerived>

    const listeners = new Set<(state: Readonly<Contents<TState, TDerived>>) => void>()
    const subscribe: Store<TState, TDerived>["subscribe"] = (callback) => {
        listeners.add(callback)

        return () => {
            listeners.delete(callback)
        }
    }

    const get: Store<TState, TDerived>["get"] = () => contents
    const set: Store<TState, TDerived>["set"] = (rawUpdate, meta = {}) => {
        const update = (() => {
            const base = rawUpdate instanceof Function ? rawUpdate(contents) : rawUpdate

            let processed = base
            for (const { transformUpdate } of middleware) {
                if (!transformUpdate) {
                    continue
                }

                processed = transformUpdate(processed, meta)
            }

            return processed
        })()
        if (Object.is(update, state) || Object.keys(update).length === 0) {
            return
        }

        state = {
            ...state,
            ...update,
        }
        derived = derive(state)
        contents = {
            ...state,
            ...derived,
            [id]: contents[id],
            [iteration]: {},
        }

        for (const { onUpdate } of middleware) {
            if (!onUpdate) {
                continue
            }

            onUpdate(update, state, meta)
        }

        for (const listenerFn of listeners) {
            listenerFn(contents)
        }
    }

    state = (() => {
        const base = initial(set)

        let processed = base
        for (const { transformInitial } of middleware) {
            if (!transformInitial) {
                continue
            }

            processed = transformInitial(processed)
        }

        return processed
    })()
    derived = derive(state)
    contents = {
        ...state,
        ...derived,
        [id]: {},
        [iteration]: {},
    }
    for (const { onInit } of middleware) {
        if (!onInit) {
            continue
        }

        onInit(state, set)
    }

    return {
        [id]: contents[id],
        get,
        set,
        subscribe,
    }
}

export const createStore = <TState extends Record<string, unknown>>(
    initial: (set: Store<TState>["set"]) => TState,
    middleware: Array<Middleware<TState>> = [],
) => createStoreWithDerived<TState, Record<never, never>>(initial, () => ({}), middleware)
