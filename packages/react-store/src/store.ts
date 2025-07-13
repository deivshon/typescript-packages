export type Store<TState extends Record<string, unknown>, TDerived extends Record<string, unknown>> = {
    get: () => Readonly<TState & TDerived>
    set: (update: Partial<TState> | ((prev: Readonly<TState & TDerived>) => Partial<TState>)) => void
    subscribe: (callback: (state: Readonly<TState & TDerived>) => void) => () => void
}

export const createStoreWithDerived = <
    TState extends Record<string, unknown>,
    TDerived extends Record<string, unknown>,
>(
    initial: (set: Store<TState, TDerived>["set"]) => TState,
    derive: (state: TState) => TDerived,
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
    const set: Store<TState, TDerived>["set"] = (update) => {
        const normalizedUpdate = update instanceof Function ? update(data) : update
        if (Object.is(normalizedUpdate, state)) {
            return
        }

        state = {
            ...state,
            ...normalizedUpdate,
        }
        derived = derive(state)
        data = {
            ...state,
            ...derived,
        }

        for (const listenerFn of listeners) {
            listenerFn(data)
        }
    }

    state = initial(set)
    derived = derive(state)
    data = {
        ...state,
        ...derived,
    }

    return {
        get,
        set,
        subscribe,
    }
}

export const createStore = <TState extends Record<string, unknown>>(
    initial: (set: Store<TState, Record<never, never>>["set"]) => TState,
) => createStoreWithDerived<TState, Record<never, never>>(initial, () => ({}))
