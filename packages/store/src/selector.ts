import { Contents, id, iteration } from "./store"

export const memoizedSelector =
    <TState extends Record<string, unknown>, TDerived extends Record<string, unknown> = Record<never, never>>() =>
    <TSelected>(select: (state: Contents<TState, TDerived>) => TSelected) => {
        const storesCache = new WeakMap<
            Contents<TState, TDerived>[typeof id],
            WeakMap<Contents<TState, TDerived>[typeof iteration], { value: TSelected }>
        >()

        return (contents: Contents<TState, TDerived>): TSelected => {
            let current = storesCache.get(contents[id])?.get(contents[iteration])
            if (!current) {
                current = { value: select(contents) }

                const iterationsCache = storesCache.get(contents[id]) ?? new WeakMap()
                iterationsCache.set(contents[iteration], current)
                storesCache.set(contents[id], iterationsCache)
            }

            return current.value
        }
    }
