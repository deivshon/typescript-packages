import { useRef, useSyncExternalStore } from "react"
import { Store } from "./store"

export const useWhole = <T extends Record<string, unknown>>(store: Store<T>): T =>
    useSyncExternalStore(store.subscribe, () => store.get())

export const useStore = <T extends Record<string, unknown>, S>(
    store: Store<T>,
    selector: (state: T) => S,
    eq: (prev: S, current: S) => boolean = Object.is,
): S => {
    const lastSelectedRef = useRef<S | null>(null)

    return useSyncExternalStore(store.subscribe, () => {
        const selected = selector(store.get())
        if (lastSelectedRef.current !== null && eq(selected, lastSelectedRef.current)) {
            return lastSelectedRef.current
        }

        lastSelectedRef.current = selected
        return selected
    })
}
