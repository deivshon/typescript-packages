import { createStoreHook, createStoreWithDerived } from "@deivshon/react-store"

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
        title: "Global",
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

export const useGlobalStore = createStoreHook(globalStore)
