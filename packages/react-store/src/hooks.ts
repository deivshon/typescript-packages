import { useRef, useSyncExternalStore } from "react"
import { Store } from "./store"

const useStore = <TState extends Record<string, unknown>, TDerived extends Record<string, unknown>, TSelected>(
    store: Store<TState, TDerived>,
    selector: (state: Readonly<TState & TDerived>) => TSelected,
    eq: (prev: Readonly<TSelected>, current: Readonly<TSelected>) => boolean = Object.is,
): TSelected => {
    const lastSelectedRef = useRef<TSelected | null>(null)

    return useSyncExternalStore(store.subscribe, () => {
        const selected = selector(store.get())
        if (lastSelectedRef.current !== null && eq(selected, lastSelectedRef.current)) {
            return lastSelectedRef.current
        }

        lastSelectedRef.current = selected
        return selected
    })
}

export const createStoreHook = <TState extends Record<string, unknown>, TDerived extends Record<string, unknown>>(
    store: Store<TState, TDerived>,
) => {
    const useStoreHook = <TSelected>(
        selector: (state: Readonly<TState & TDerived>) => TSelected,
        eq: (prev: Readonly<TSelected>, current: Readonly<TSelected>) => boolean = Object.is,
    ) => useStore(store, selector, eq)

    return Object.assign<typeof useStoreHook, Store<TState, TDerived>>(useStoreHook, store)
}
