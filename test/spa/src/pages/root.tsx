import { shallowEq, useStore } from "react-store"
import { globalStore, useGlobalStore } from "../lib/global-store"
import { useSimpleStore } from "../lib/simple-store"

export const RootPage = () => {
    const title = useStore(globalStore, (state) => ({ title: state.title }), shallowEq)
    const description = useStore(globalStore, (state) => state.description)

    return (
        <div>
            <h1>{title.title}</h1>
            <p>{description}</p>
            <RootPageCounter />
            <RootPageRandomNumber />
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
            <button onClick={() => randomize()}>randomize</button>
        </div>
    )
}
