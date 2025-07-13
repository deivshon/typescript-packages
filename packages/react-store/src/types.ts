import { Store } from "./store"

export type UseStore<
    TStore extends Store<Record<string, unknown>, Record<string, unknown>>,
    TCurrent = ReturnType<TStore["get"]>,
> = <TSelected>(selector: (current: TCurrent) => TSelected) => TSelected
