import { shallowEq, useAtom } from "@deivshon/react-store"
import { Link, useSearchParams } from "react-router"
import { useGlobalStore } from "../lib/global-store"
import { usePersistedStore } from "../lib/persist-store"
import { persistedAtom } from "../lib/persisted-atom"
import { simpleAtom } from "../lib/simple-atom"
import { simpleStoreStringSelector, useSimpleStore } from "../lib/simple-store"

export const StorePage = () => {
    const title = useGlobalStore((state) => ({ title: state.title }), shallowEq)
    const description = useGlobalStore((state) => state.description)
    const randomizeAll = usePersistedStore((state) => state.randomizeAll)

    const [searchParams, setSearchParams] = useSearchParams()
    const onReactRouterCountIncrease = () => {
        const current = Number(searchParams.get("rr-count"))
        setSearchParams((p) => {
            p.set("rr-count", String(isNaN(current) ? 1 : current + 1))
            return p
        })
    }

    return (
        <div className="min-h-screen bg-slate-50 py-10">
            <div className="mx-auto max-w-6xl px-6">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-800">React Router SPA {"<>"} Store testing</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <nav className="text-sm text-indigo-600">
                            <Link to="/heavy" className="hover:underline">
                                Heavy
                            </Link>
                        </nav>
                        <div className="text-sm text-slate-600">
                            React Router URL Count{" "}
                            <span className="font-medium text-slate-800">{searchParams.get("rr-count")}</span>
                        </div>
                        <button
                            onClick={onReactRouterCountIncrease}
                            className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-500"
                        >
                            Increment
                        </button>
                    </div>
                </header>

                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-md p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-800">{title.title}</h1>
                                    <p className="text-sm text-slate-500">{description}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <RootPageCounter />
                                    <button
                                        type="button"
                                        onClick={randomizeAll}
                                        className="ml-2 inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-500"
                                    >
                                        Randomize All
                                    </button>
                                </div>
                            </div>
                            <div className="mt-6">
                                <RootPageRandomNumber />
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-md p-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-3">Persisted various</h3>
                            <RootPagePersistedVarious />
                        </div>
                        <div className="bg-white rounded-2xl shadow-md p-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-3">Memoized selector</h3>
                            <div className="flex items-start gap-4 flex-col">
                                <RootSimpleStoreStringInput />
                                <div className="flex flex-wrap items-center gap-2">
                                    {Array.from({ length: 10 }).map((_, idx) => (
                                        <RootSimpleStoreString key={idx} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <aside className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-md p-6">
                            <h4 className="text-sm font-medium text-slate-700 mb-2">Atoms</h4>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-3 flex-wrap">
                                        <RootSimpleAtom />
                                        <RootSimpleAtom />
                                        <RootSimpleAtom />
                                    </div>
                                    <div className="flex gap-3 flex-wrap">
                                        <RootPersistedAtom />
                                        <RootPersistedAtom />
                                        <RootPersistedAtom />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </section>
            </div>
        </div>
    )
}

const RootPageCounter = () => {
    const count = useGlobalStore((state) => state.count)
    const setCount = useGlobalStore((state) => state.setCount)
    const setTitle = useGlobalStore((state) => state.setTitle)

    const onCountIncrement = () => {
        const newCount = count + 1
        setCount(newCount)

        if (newCount % 2 === 0) {
            setTitle(`Title ${newCount}`)
        }
    }

    return (
        <div className="flex items-center gap-3">
            <p className="text-sm text-slate-700">
                Count: <span className="font-medium text-slate-900">{count}</span>
            </p>
            <button
                type="button"
                onClick={onCountIncrement}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-500"
            >
                Increment
            </button>
        </div>
    )
}

const RootPageRandomNumber = () => {
    const random = useSimpleStore((state) => state.number)
    const randomize = useSimpleStore((state) => state.randomize)

    return (
        <div className="flex items-center gap-3">
            <p className="text-sm text-slate-700">
                Random: <span className="font-medium text-slate-900">{random}</span>
            </p>
            <button
                onClick={randomize}
                className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-500"
            >
                Randomize
            </button>
        </div>
    )
}

const RootPagePersistedVarious = () => {
    const {
        memory1,
        memory2,
        memory3,
        memory4,
        local1,
        local2,
        local3,
        local4,
        session1,
        session2,
        session3,
        session4,
        url1,
        url2,
        url3,
        url4,
        idb1,
        idb2,
        idb3,
        idb4,
        randomize1,
        randomize2,
        randomize3,
        randomize4,
        profile,
        movie,
        randomizeNonPrimitives,
        numberSet,
        randomizeNumberSet,
        numberMap,
        randomizeNumberMap,
    } = usePersistedStore((state) => state)

    const mapValue = Array.from(numberMap.entries())
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")

    return (
        <div>
            <div className="flex flex-col mt-4">
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={randomize1}
                        className="px-3 py-1.5 bg-sky-600 text-white rounded-md text-sm hover:bg-sky-500"
                    >
                        Randomize 1
                    </button>
                    <button
                        onClick={randomize2}
                        className="px-3 py-1.5 bg-sky-600 text-white rounded-md text-sm hover:bg-sky-500"
                    >
                        Randomize 2
                    </button>
                    <button
                        onClick={randomize3}
                        className="px-3 py-1.5 bg-sky-600 text-white rounded-md text-sm hover:bg-sky-500"
                    >
                        Randomize 3
                    </button>
                    <button
                        onClick={randomize4}
                        className="px-3 py-1.5 bg-sky-600 text-white rounded-md text-sm hover:bg-sky-500"
                    >
                        Randomize 4
                    </button>
                    <button type="button" onClick={randomizeNonPrimitives}>
                        <span className="inline-flex items-center px-3 py-1.5 bg-amber-600 text-white rounded-md text-sm hover:bg-amber-500">
                            Randomize Non-Primitives
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={randomizeNumberSet}
                        className="w-fit px-3 py-1.5 bg-violet-600 text-white rounded-md text-sm hover:bg-violet-500"
                    >
                        Randomize Number Set
                    </button>
                    <button
                        type="button"
                        onClick={randomizeNumberMap}
                        className="w-fit px-3 py-1.5 bg-violet-600 text-white rounded-md text-sm hover:bg-violet-500"
                    >
                        Randomize Number Map
                    </button>
                </div>
            </div>
            <div className="flex flex-col text-sm mt-4">
                <span>
                    <strong>Memory 1</strong>: {memory1}
                </span>
                <span>
                    <strong>Memory 2</strong>: {memory2}
                </span>
                <span>
                    <strong>Memory 3</strong>: {String(memory3)}
                </span>
                <span>
                    <strong>Memory 4</strong>: {String(memory4)}
                </span>
                <span>
                    <strong>Local 1</strong>: {local1}
                </span>
                <span>
                    <strong>Local 2</strong>: {local2}
                </span>
                <span>
                    <strong>Local 3</strong>: {String(local3)}
                </span>
                <span>
                    <strong>Local 4</strong>: {String(local4)}
                </span>
                <span>
                    <strong>Session 1</strong>: {session1}
                </span>
                <span>
                    <strong>Session 2</strong>: {session2}
                </span>
                <span>
                    <strong>Session 3</strong>: {String(session3)}
                </span>
                <span>
                    <strong>Session 4</strong>: {String(session4)}
                </span>
                <span>
                    <strong>URL 1</strong>: {url1}
                </span>
                <span>
                    <strong>URL 2</strong>: {url2}
                </span>
                <span>
                    <strong>URL 3</strong>: {String(url3)}
                </span>
                <span>
                    <strong>URL 4</strong>: {String(url4)}
                </span>
                <span>
                    <strong>IDB 1</strong>: {idb1}
                </span>
                <span>
                    <strong>IDB 2</strong>: {idb2}
                </span>
                <span>
                    <strong>IDB 3</strong>: {String(idb3)}
                </span>
                <span>
                    <strong>IDB 4</strong>: {String(idb4)}
                </span>
                <p className="flex flex-col  mt-2">
                    <strong>Profile</strong>
                    <span>Age: {profile.age}</span>
                    <span>Name: {profile.name}</span>
                    {profile.notes.length > 0 && (
                        <span>
                            Notes:{" "}
                            {profile.notes
                                .map((note) => `${note.value} (${new Date(note.createdAt).toUTCString()})`)
                                .join(", ")}
                        </span>
                    )}
                </p>
                {movie && (
                    <p className="flex flex-col">
                        <strong>Movie</strong>
                        <span>Length: {movie.length ?? "Unknown"}</span>
                        <span>Name: {movie.name}</span>
                        {movie.notes.length > 0 && (
                            <span>Notes: {movie.notes.map((note) => `${note.value} (${note.id})`).join(", ")}</span>
                        )}
                    </p>
                )}
                <span className="mt-2">
                    <strong>Set</strong>: {Array.from(numberSet).map(String).join(", ")}
                </span>
                <span>
                    <strong>Map</strong>: {mapValue.length > 0 ? mapValue : "(empty)"}
                </span>
            </div>
        </div>
    )
}

const RootSimpleStoreStringInput = () => {
    const string = useSimpleStore(simpleStoreStringSelector)
    const setString = useSimpleStore((state) => state.setString)

    return (
        <div>
            <input
                value={string}
                onChange={(e) => setString(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm w-72 bg-white text-slate-800 border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                aria-label="Simple store string input"
            />
        </div>
    )
}

const RootSimpleStoreString = () => {
    const string = useSimpleStore(simpleStoreStringSelector)

    return <span className="mr-4 text-sm text-slate-700">{string}</span>
}

export const RootSimpleAtom = () => {
    const [value, setValue] = useAtom(simpleAtom)

    return (
        <div className="flex items-center gap-3 bg-slate-50 rounded-md px-3 py-2">
            <span className="text-sm text-slate-700">
                Simple Atom: <span className="font-medium text-slate-900">{value}</span>
            </span>
            <button
                type="button"
                onClick={() => setValue(value + 1)}
                className="ml-2 px-2 py-1 bg-slate-700 text-white rounded text-sm hover:bg-slate-600"
            >
                Increment
            </button>
        </div>
    )
}

export const RootPersistedAtom = () => {
    const [value, setValue] = useAtom(persistedAtom)

    return (
        <div className="flex items-center gap-3 bg-slate-50 rounded-md px-3 py-2">
            <span className="text-sm text-slate-700">
                Persisted Atom: <span className="font-medium text-slate-900">{value}</span>
            </span>
            <button
                type="button"
                onClick={() => setValue(value + 1)}
                className="ml-2 px-2 py-1 bg-slate-700 text-white rounded text-sm hover:bg-slate-600"
            >
                Increment
            </button>
        </div>
    )
}
