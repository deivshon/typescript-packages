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
    const { memory1, memory2, local1, local2, session1, session2, randomize1, randomize2 } = usePersistedStore(
        (state) => state,
    )

    return (
        <div>
            <p>
                <div>memory1: {memory1}</div>
                <div>memory2: {memory2}</div>
                <div>local1: {local1}</div>
                <div>local2: {local2}</div>
                <div>session1: {session1}</div>
                <div>session2: {session2}</div>
            </p>
            <button onClick={randomize1}>randomize 1</button>
            <button onClick={randomize2}>randomize 2</button>
        </div>
    )
}
