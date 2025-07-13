import { createStore } from "react-store"

type GlobalStore = {
    title: string
    setTitle: (title: string) => void
    count: number
    setCount: (count: number) => void
}

export const globalStore = createStore<GlobalStore>((set) => ({
    title: "global",
    setTitle: (title) => set({ title }),
    count: 0,
    setCount: (count) =>
        set({
            count,
        }),
}))
