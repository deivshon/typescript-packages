import { createStore, createStoreHook } from "react-store"
import { persist, serde, storage } from "react-store/persist"
import { makeRandomMovie, movieSchema, type Movie } from "./schema/movie"
import { defaultProfile, makeRandomProfile, profileSchema, type Profile } from "./schema/profile"

type PersistedStore = {
    memory1: number
    memory2: string
    memory3: boolean
    memory4: Date
    local1: number
    local2: string
    local3: boolean
    local4: Date
    session1: number
    session2: string
    session3: boolean
    session4: Date
    url1: number
    url2: string
    url3: boolean
    url4: Date
    profile: Profile
    movie: Movie | null
    randomize1: () => void
    randomize2: () => void
    randomize3: () => void
    randomize4: () => void
    randomizeNonPrimitives: () => void
    randomizeAll: () => void
}

const persistedStore = createStore<PersistedStore>(
    (set) => ({
        memory1: 0,
        memory2: "0",
        memory3: false,
        memory4: new Date(0),
        local1: 0,
        local2: "0",
        local3: false,
        local4: new Date(0),
        session1: 0,
        session2: "0",
        session3: false,
        session4: new Date(0),
        url1: 0,
        url2: "0",
        url3: false,
        url4: new Date(0),
        profile: defaultProfile,
        movie: null,
        randomize1: () => set(random1()),
        randomize2: () => set(random2()),
        randomize3: () => set(random3()),
        randomize4: () => set(random4()),
        randomizeNonPrimitives: () => set(randomNonPrimitives()),
        randomizeAll: () =>
            set({
                ...random1(),
                ...random2(),
                ...random3(),
                ...random4(),
                ...randomNonPrimitives(),
            }),
    }),
    [
        persist("persisted-store", {
            local1: [serde.number, storage.local()],
            local2: [serde.string, storage.local()],
            local3: [serde.boolean, storage.local()],
            local4: [serde.date, storage.local()],
            session1: [serde.number, storage.session()],
            session2: [serde.string, storage.session()],
            session3: [serde.boolean, storage.session()],
            session4: [serde.date, storage.session()],
            url1: [serde.number, storage.url({ push: true })],
            url2: [serde.string, storage.url()],
            url3: [serde.boolean, storage.url({ push: true })],
            url4: [serde.date, storage.url()],
            profile: [serde.schema(profileSchema, defaultProfile), storage.local()],
            movie: [serde.schema(movieSchema.or("null"), null), storage.local()],
        }),
    ],
)

export const usePersistedStore = createStoreHook(persistedStore)

const random1 = (): Partial<PersistedStore> => ({
    memory1: Math.floor(Math.random() * 100),
    local1: Math.floor(Math.random() * 100),
    session1: Math.floor(Math.random() * 100),
    url1: Math.floor(Math.random() * 100),
})
const random2 = (): Partial<PersistedStore> => ({
    memory2: String(Math.floor(Math.random() * 100)),
    local2: String(Math.floor(Math.random() * 100)),
    session2: String(Math.floor(Math.random() * 100)),
    url2: String(Math.floor(Math.random() * 100)),
})
const random3 = (): Partial<PersistedStore> => ({
    memory3: Math.random() > 0.5,
    local3: Math.random() > 0.5,
    session3: Math.random() > 0.5,
    url3: Math.random() > 0.5,
})
const random4 = (): Partial<PersistedStore> => ({
    memory4: Math.random() > 0.9 ? new Date(NaN) : new Date(Math.floor(Math.random() * Date.now())),
    local4: Math.random() > 0.9 ? new Date(NaN) : new Date(Math.floor(Math.random() * Date.now())),
    session4: Math.random() > 0.9 ? new Date(NaN) : new Date(Math.floor(Math.random() * Date.now())),
    url4: Math.random() > 0.9 ? new Date(NaN) : new Date(Math.floor(Math.random() * Date.now())),
})
const randomNonPrimitives = (): Partial<PersistedStore> => ({
    profile: makeRandomProfile(),
    movie: Math.random() > 0.5 ? makeRandomMovie() : null,
})
