export type Store<T extends Record<string, unknown>> = {
    get: () => Readonly<T>
    set: (update: Partial<T> | ((prev: Readonly<T>) => Partial<T>)) => void
    subscribe: (callback: (state: Readonly<T>) => void) => () => void
}

export const createStore = <T extends Record<string, unknown>>(initial: (set: Store<T>["set"]) => T): Store<T> => {
    let state: T

    const listeners = new Set<(state: Readonly<T>) => void>()
    const subscribe: Store<T>["subscribe"] = (callback) => {
        listeners.add(callback)

        return () => {
            listeners.delete(callback)
        }
    }

    const get: Store<T>["get"] = () => state
    const set: Store<T>["set"] = (update) => {
        const normalizedUpdate = update instanceof Function ? update(state) : update

        state = {
            ...state,
            ...normalizedUpdate,
        }

        for (const listenerFn of listeners) {
            listenerFn(state)
        }
    }

    state = initial(set)

    return {
        get,
        set,
        subscribe,
    }
}
