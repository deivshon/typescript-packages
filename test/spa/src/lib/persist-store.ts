import { createStore, createStoreHook } from "@deivshon/react-store"
import { boolean, date, map, nullable, number, schema, set, string } from "@deivshon/serialization"
import { idb, local, session, url } from "@deivshon/storage"
import { persistStore } from "@deivshon/store-persist-middleware"
import { type } from "arktype"
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
    url4: Date | null
    idb1: number
    idb2: string
    idb3: boolean
    idb4: Date | null
    profile: Profile
    movie: Movie | undefined | null
    numberSet: Set<number | null>
    numberMap: Map<number, number>
    randomize1: () => void
    randomize2: () => void
    randomize3: () => void
    randomize4: () => void
    randomizeNonPrimitives: () => void
    randomizeAll: () => void
    randomizeNumberSet: () => void
    randomizeNumberMap: () => void
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
        idb1: 0,
        idb2: "0",
        idb3: false,
        idb4: new Date(0),
        profile: defaultProfile,
        movie: undefined,
        numberSet: new Set([1, 2, 3]),
        numberMap: new Map([
            [1, 2],
            [2, 3],
        ]),
        randomize1: () => set(random1()),
        randomize2: () => set(random2()),
        randomize3: () => set(random3()),
        randomize4: () => set(random4()),
        randomizeNonPrimitives: () => set(randomNonPrimitives()),
        randomizeNumberMap: () => set(randomNumberMap()),
        randomizeAll: () =>
            set({
                ...random1(),
                ...random2(),
                ...random3(),
                ...random4(),
                ...randomNonPrimitives(),
                ...randomNumberSet(),
                ...randomNumberMap(),
            }),
        randomizeNumberSet: () => set(randomNumberSet()),
    }),
    [
        persistStore<PersistedStore>("persisted-store", {
            local1: [number, local()],
            local2: [string, local()],
            local3: [boolean, local()],
            local4: [date, local()],
            session1: [number, session()],
            session2: [string, session()],
            session3: [boolean, session()],
            session4: [date, session()],
            url1: [number, url({ push: true }), { key: "ps-url-1" }],
            url2: [string, url(), { key: "ps-url-2" }],
            url3: [boolean, url({ push: true }), { key: "ps-url-3" }],
            url4: [nullable(date), url(), { key: "ps-url-4" }],
            idb1: [number, idb()],
            idb2: [string, idb()],
            idb3: [boolean, idb()],
            idb4: [nullable(date), idb()],
            profile: [schema(profileSchema), local()],
            movie: [schema(movieSchema.or("null | undefined")), url()],
            numberSet: [set(schema(type("number | null"))), url()],
            numberMap: [map(number, number), url()],
        }),
    ],
)

export const usePersistedStore = createStoreHook(persistedStore)

const random1 = (): Partial<PersistedStore> => ({
    memory1: Math.floor(Math.random() * 100),
    local1: Math.floor(Math.random() * 100),
    session1: Math.floor(Math.random() * 100),
    url1: Math.floor(Math.random() * 100),
    idb1: Math.floor(Math.random() * 100),
})
const random2 = (): Partial<PersistedStore> => ({
    memory2: String(Math.floor(Math.random() * 100)),
    local2: String(Math.floor(Math.random() * 100)),
    session2: String(Math.floor(Math.random() * 100)),
    url2: String(Math.floor(Math.random() * 100)),
    idb2: String(Math.floor(Math.random() * 100)),
})
const random3 = (): Partial<PersistedStore> => ({
    memory3: Math.random() > 0.5,
    local3: Math.random() > 0.5,
    session3: Math.random() > 0.5,
    url3: Math.random() > 0.5,
    idb3: Math.random() > 0.5,
})
const random4 = (): Partial<PersistedStore> => ({
    memory4: Math.random() > 0.9 ? new Date(NaN) : new Date(Math.floor(Math.random() * Date.now())),
    local4: Math.random() > 0.9 ? new Date(NaN) : new Date(Math.floor(Math.random() * Date.now())),
    session4: Math.random() > 0.9 ? new Date(NaN) : new Date(Math.floor(Math.random() * Date.now())),
    url4: Math.random() > 0.9 ? null : new Date(Math.floor(Math.random() * Date.now())),
    idb4: Math.random() > 0.9 ? null : new Date(Math.floor(Math.random() * Date.now())),
})
const randomNonPrimitives = (): Partial<PersistedStore> => ({
    profile: makeRandomProfile(),
    movie: Math.random() > 0.5 ? makeRandomMovie() : Math.random() > 0.5 ? null : undefined,
})
const randomNumberSet = () => ({
    numberSet: new Set(
        Array.from({ length: Math.floor(Math.random() * 100) }).map((_, idx) =>
            Math.random() > 0.9 ? Math.floor(Math.random() * idx) : null,
        ),
    ),
})
const randomNumberMap = () => ({
    numberMap: new Map(
        Array.from({ length: Math.floor(Math.random() * 10) }).map(
            (_, idx) => [idx, Math.floor(Math.random() * 10)] as const,
        ),
    ),
})
