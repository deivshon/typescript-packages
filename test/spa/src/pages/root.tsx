import { shallowEq } from "react-store"
import { useGlobalStore } from "../lib/global-store"
import { usePersistedStore } from "../lib/persist-store"
import { useSimpleStore } from "../lib/simple-store"

export const RootPage = () => {
    const title = useGlobalStore((state) => ({ title: state.title }), shallowEq)
    const description = useGlobalStore((state) => state.description)

    return (
        <div>
            <h1>{title.title}</h1>
            <p>{description}</p>
            <RootPageCounter />
            <RootPageRandomNumber />
            <RootPagePersistedNumbers />
            <div style={{ height: "2rem" }} />
            <RootPagePersistedNonPrimitives />
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
    const { memory1, memory2, local1, local2, session1, session2, url1, url2, randomize1, randomize2 } =
        usePersistedStore((state) => state)

    return (
        <div>
            <p
                style={{
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <span>memory1: {memory1}</span>
                <span>memory2: {memory2}</span>
                <span>local1: {local1}</span>
                <span>local2: {local2}</span>
                <span>session1: {session1}</span>
                <span>session2: {session2}</span>
                <span>url1: {url1}</span>
                <span>url2: {url2}</span>
            </p>
            <button onClick={randomize1}>randomize 1</button>
            <button onClick={randomize2}>randomize 2</button>
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
            <p
                style={{
                    display: "flex",
                    flexDirection: "column",
                }}
            >
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
                <p
                    style={{
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
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
