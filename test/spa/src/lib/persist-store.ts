import { createStore, createStoreHook, persist, serde, storage } from "react-store"

type PersistedStore = {
    memory1: number
    memory2: number
    local1: number
    local2: number
    session1: number
    session2: number
    randomize1: () => void
    randomize2: () => void
}

const persistedStore = createStore<PersistedStore>(
    (set) => ({
        memory1: 0,
        memory2: 0,
        local1: 0,
        local2: 0,
        session1: 0,
        session2: 0,
        randomize1: () =>
            set({
                memory1: Math.floor(Math.random() * 100),
                local1: Math.floor(Math.random() * 100),
                session1: Math.floor(Math.random() * 100),
            }),
        randomize2: () =>
            set({
                memory2: Math.floor(Math.random() * 100),
                local2: Math.floor(Math.random() * 100),
                session2: Math.floor(Math.random() * 100),
            }),
    }),
    [
        persist("persisted-store", {
            local1: [serde.number, storage.local],
            local2: [serde.number, storage.local],
            session1: [serde.number, storage.session],
            session2: [serde.number, storage.session],
        }),
    ],
)

export const usePersistedStore = createStoreHook(persistedStore)
