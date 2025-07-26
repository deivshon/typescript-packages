import { createStore, createStoreHook, persist, serde } from "react-store"

type SimpleStore = {
    number: number
    randomize: () => void
}

export const simpleStore = createStore<SimpleStore>(
    (set) => ({
        number: 0,
        randomize: () =>
            set({
                number: Math.floor(Math.random() * 100),
            }),
    }),
    [
        persist("simple-store", {
            number: serde.number,
        }),
    ],
)

export const useSimpleStore = createStoreHook(simpleStore)
