import { createStore, Middleware, Store } from "./store"

export type AtomState<T> = { value: T; set: (value: T) => void }
export type Atom<T> = Store<AtomState<T>>

export const createAtom = <T>(initial: T, middleware: Array<Middleware<AtomState<T>>> = []): Atom<T> =>
    createStore<AtomState<T>>(
        (set) => ({
            value: initial,
            set: (value: T) => {
                set({ value })
            },
        }),
        middleware,
    )
