import { createStore, createStoreHook, memoizedSelector } from "react-store"

type SimpleStore = {
    number: number
    randomize: () => void
    string: string
    setString: (string: string) => void
}

export const simpleStore = createStore<SimpleStore>((set) => ({
    number: 0,
    randomize: () =>
        set({
            number: Math.floor(Math.random() * 100),
        }),
    string: "",
    setString: (string) => set({ string }),
}))

export const useSimpleStore = createStoreHook(simpleStore)

export const simpleStoreStringSelector = memoizedSelector<SimpleStore>()((state: SimpleStore) => {
    let n = 0
    for (const _ of Array.from({ length: 100_000 })) {
        n = ((n) => n)(n)
    }

    return state.string
})
