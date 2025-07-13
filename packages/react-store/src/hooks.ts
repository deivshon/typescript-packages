import { useRef, useSyncExternalStore } from "react"
import { Store } from "./store"

export const useWhole = <TState extends Record<string, unknown>, TDerived extends Record<string, unknown>>(
    store: Store<TState, TDerived>,
): TState => useSyncExternalStore(store.subscribe, () => store.get())

export const useStore = <TState extends Record<string, unknown>, TDerived extends Record<string, unknown>, TSelected>(
    store: Store<TState, TDerived>,
    selector: (state: TState & TDerived) => TSelected,
    eq: (prev: TSelected, current: TSelected) => boolean = Object.is,
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
