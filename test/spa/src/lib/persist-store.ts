import { createStore, createStoreHook, persist, serde, storage } from "react-store"
import { makeRandomMovie, movieSchema, type Movie } from "./schema/movie"
import { defaultProfile, makeRandomProfile, profileSchema, type Profile } from "./schema/profile"

type PersistedStore = {
    memory1: number
    memory2: number
    local1: number
    local2: number
    session1: number
    session2: number
    url1: number
    url2: number
    profile: Profile
    movie: Movie | null
    randomize1: () => void
    randomize2: () => void
    randomizeNonPrimitives: () => void
}

const persistedStore = createStore<PersistedStore>(
    (set) => ({
        memory1: 0,
        memory2: 0,
        local1: 0,
        local2: 0,
        session1: 0,
        session2: 0,
        url1: 0,
        url2: 0,
        profile: defaultProfile,
        movie: null,
        randomize1: () =>
            set({
                memory1: Math.floor(Math.random() * 100),
                local1: Math.floor(Math.random() * 100),
                session1: Math.floor(Math.random() * 100),
                url1: Math.floor(Math.random() * 100),
            }),
        randomize2: () =>
            set({
                memory2: Math.floor(Math.random() * 100),
                local2: Math.floor(Math.random() * 100),
                session2: Math.floor(Math.random() * 100),
                url2: Math.floor(Math.random() * 100),
            }),
        randomizeNonPrimitives: () =>
            set({
                profile: makeRandomProfile(),
                movie: Math.random() > 0.5 ? makeRandomMovie() : null,
            }),
    }),
    [
        persist("persisted-store", {
            local1: [serde.number, storage.local],
            local2: [serde.number, storage.local],
            session1: [serde.number, storage.session],
            session2: [serde.number, storage.session],
            url1: [serde.number, storage.url],
            url2: [serde.number, storage.url],
            profile: [serde.schema(profileSchema, defaultProfile), storage.local],
            movie: [serde.schema(movieSchema.or("null"), null), storage.local],
        }),
    ],
)

export const usePersistedStore = createStoreHook(persistedStore)
