import { shallowEq } from "@deivshon/react-store"
import { idb } from "@deivshon/storage"
import * as React from "react"
import { Link, useSearchParams } from "react-router"
import { useGlobalStore } from "../lib/global-store"
import { usePersistedStore } from "../lib/persist-store"
import { simpleStoreStringSelector, useSimpleStore } from "../lib/simple-store"

export const RootPage = () => {
    const title = useGlobalStore((state) => ({ title: state.title }), shallowEq)
    const description = useGlobalStore((state) => state.description)
    const randomizeAll = usePersistedStore((state) => state.randomizeAll)

    const [searchParams, setSearchParams] = useSearchParams()
    const onReactRouterCountIncrease = () => {
        const current = Number(searchParams.get("rr-count"))
        setSearchParams((p) => {
            p.set("rr-count", isNaN(current) ? String(1) : String(current + 1))
            return p
        })
    }
    return (
        <div>
            <p>
                Root <Link to="/page-1">Page 1</Link>
            </p>
            React Router url count {searchParams.get("rr-count")}
            <button onClick={onReactRouterCountIncrease}>Increment</button>
            <h1>{title.title}</h1>
            <p>{description}</p>
            <RootPageCounter />
            <button type="button" onClick={randomizeAll}>
                Randomize all
            </button>
            <RootPageRandomNumber />
            <RootPagePersistedNumbers />
            <div style={{ height: "2rem" }} />
            <RootPagePersistedNonPrimitives />
            <div>
                <RootSimpleStoreStringInput />
                {Array.from({ length: 100 }).map((_, idx) => (
                    <RootSimpleStoreString key={idx} />
                ))}
            </div>
            <RootPageNumberSet />
            <RootPageNumberMap />
            <RootPageIndexedDb />
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
        <div>
            <p>{count}</p>
            <button type="button" onClick={onCountIncrement}>
                Increment
            </button>
        </div>
    )
}

const RootPageRandomNumber = () => {
    const random = useSimpleStore((state) => state.number)
    const randomize = useSimpleStore((state) => state.randomize)

    return (
        <div>
            <p>random: {random}</p>
            <button onClick={randomize}>randomize</button>
        </div>
    )
}

const RootPagePersistedNumbers = () => {
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
        randomize1,
        randomize2,
        randomize3,
        randomize4,
    } = usePersistedStore((state) => state)

    return (
        <div>
            <p style={columnStyle}>
                <span>memory1: {memory1}</span>
                <span>memory2: {memory2}</span>
                <span>memory3: {String(memory3)}</span>
                <span>memory4: {String(memory4)}</span>
                <span>local1: {local1}</span>
                <span>local2: {local2}</span>
                <span>local3: {String(local3)}</span>
                <span>local4: {String(local4)}</span>
                <span>session1: {session1}</span>
                <span>session2: {session2}</span>
                <span>session3: {String(session3)}</span>
                <span>session4: {String(session4)}</span>
                <span>url1: {url1}</span>
                <span>url2: {url2}</span>
                <span>url3: {String(url3)}</span>
                <span>url4: {String(url4)}</span>
            </p>
            <div style={columnStyle}>
                <button style={{ width: "10rem" }} onClick={randomize1}>
                    randomize 1
                </button>
                <button style={{ width: "10rem" }} onClick={randomize2}>
                    randomize 2
                </button>
                <button style={{ width: "10rem" }} onClick={randomize3}>
                    randomize 3
                </button>
                <button style={{ width: "10rem" }} onClick={randomize4}>
                    randomize 4
                </button>
            </div>
        </div>
    )
}

const RootPagePersistedNonPrimitives = () => {
    const { profile, movie, randomizeNonPrimitives } = usePersistedStore((state) => state)

    return (
        <div>
            <button type="button" onClick={randomizeNonPrimitives}>
                Randomize non primitives
            </button>
            <p style={columnStyle}>
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
                <p style={columnStyle}>
                    <strong>Movie</strong>
                    <span>Length: {movie.length ?? "unknown"}</span>
                    <span>Name: {movie.name}</span>
                    {movie.notes.length > 0 && (
                        <span>Notes: {movie.notes.map((note) => `${note.value} (${note.id})`).join(", ")}</span>
                    )}
                </p>
            )}
        </div>
    )
}

const RootSimpleStoreStringInput = () => {
    const string = useSimpleStore(simpleStoreStringSelector)
    const setString = useSimpleStore((state) => state.setString)

    return (
        <div>
            <input value={string} onChange={(e) => setString(e.target.value)} />
        </div>
    )
}

const RootSimpleStoreString = () => {
    const string = useSimpleStore(simpleStoreStringSelector)

    return <span style={{ marginRight: "1rem" }}>{string}</span>
}

const RootPageNumberSet = () => {
    const { numberSet, randomizeNumberSet } = usePersistedStore((state) => state)

    return (
        <div style={columnStyle}>
            <span>{Array.from(numberSet).map(String).join(",")}</span>
            <button type="button" onClick={randomizeNumberSet} style={{ width: "fit-content" }}>
                Randomize number set
            </button>
        </div>
    )
}

const RootPageNumberMap = () => {
    const { numberMap, randomizeNumberMap } = usePersistedStore((state) => state)

    return (
        <div style={columnStyle}>
            <span>
                {Array.from(numberMap.entries())
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(",")}
            </span>
            <button type="button" onClick={randomizeNumberMap} style={{ width: "fit-content" }}>
                Randomize number map
            </button>
        </div>
    )
}

const RootPageIndexedDb = () => {
    const storageKey = "root-random-numbers"
    const [a, setA] = React.useState<string>("")
    const [b, setB] = React.useState<string>("")
    const [c, setC] = React.useState<string>("")

    const onWrite = async () => {
        const na = String(Math.floor(Math.random() * 100000))
        const nb = String(Math.floor(Math.random() * 100000))
        const nc = String(Math.floor(Math.random() * 100000))

        try {
            await idb.set(storageKey, { a: na, b: nb, c: nc }, {})
        } catch (err) {
            console.error(err)
        }
    }

    const onRead = async () => {
        try {
            const value = await idb.get(storageKey)
            setA(value.a ?? "")
            setB(value.b ?? "")
            setC(value.c ?? "")
        } catch (err) {
            setA("")
            setB("")
            setC("")
        }
    }

    return (
        <div style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <button type="button" onClick={onWrite}>
                    Write
                </button>
                <button type="button" onClick={onRead}>
                    Read
                </button>
            </div>
            <ul>
                <li>a: {a}</li>
                <li>b: {b}</li>
                <li>c: {c}</li>
            </ul>
        </div>
    )
}

const columnStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
}
