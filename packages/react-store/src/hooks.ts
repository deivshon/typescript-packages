import { Atom, Store } from "@deivshon/store"
import { useRef, useSyncExternalStore } from "react"

const useStore = <TState extends Record<string, unknown>, TDerived extends Record<string, unknown>, TSelected>(
    store: Store<TState, TDerived>,
    selector: (state: ReturnType<Store<TState, TDerived>["get"]>) => TSelected,
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
        selector: (state: ReturnType<Store<TState, TDerived>["get"]>) => TSelected,
        eq: (prev: Readonly<TSelected>, current: Readonly<TSelected>) => boolean = Object.is,
    ) => useStore(store, selector, eq)

    return Object.assign<typeof useStoreHook, Store<TState, TDerived>>(useStoreHook, store)
}

export const useAtom = <TValue>(
    atom: Atom<TValue>,
    eq: (prev: Readonly<TValue>, current: Readonly<TValue>) => boolean = Object.is,
): [TValue, (value: TValue | ((prev: TValue) => TValue)) => void] => {
    const atomValue = useStore(atom, (state) => state.value, eq)
    const setAtomValue = (value: TValue | ((prev: TValue) => TValue)) => {
        atom.set({ value: value instanceof Function ? value(atomValue) : value })
    }

    return [atomValue, setAtomValue]
}
