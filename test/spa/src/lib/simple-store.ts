import { createStore, createStoreHook } from "react-store"

type SimpleStore = {
    number: number
    randomize: () => void
}

export const simpleStore = createStore<SimpleStore>((set) => ({
    number: 0,
    randomize: () =>
        set({
            number: Math.floor(Math.random() * 100),
        }),
}))

export const useSimpleStore = createStoreHook(simpleStore)
