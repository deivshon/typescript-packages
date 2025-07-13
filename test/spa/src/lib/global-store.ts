import { createStoreWithDerived, useStore, type UseStore } from "react-store"

type GlobalStoreState = {
    title: string
    setTitle: (title: string) => void
    count: number
    setCount: (count: number) => void
}

type GlobalStoreDerived = {
    description: string
}

export const globalStore = createStoreWithDerived<GlobalStoreState, GlobalStoreDerived>(
    (set) => ({
        title: "global",
        setTitle: (title) => set({ title }),
        count: 0,
        setCount: (count) =>
            set({
                count,
            }),
    }),
    (state) => ({
        description: `Count has been clicked ${state.count} times!`,
    }),
)

export const useGlobalStore: UseStore<typeof globalStore> = (selector) => useStore(globalStore, selector)
