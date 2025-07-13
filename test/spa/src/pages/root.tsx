import { shallowEq, useStore } from "react-store"
import { globalStore } from "../lib/global-store"

export const RootPage = () => {
    const titleCount = useStore(globalStore, (state) => ({ title: state.title }), shallowEq)

    return (
        <div>
            <h1>{titleCount.title}</h1>
            <RootPageCounter />
        </div>
    )
}

const RootPageCounter = () => {
    const count = useStore(globalStore, (state) => state.count)
    const setCount = useStore(globalStore, (state) => state.setCount)
    const setTitle = useStore(globalStore, (state) => state.setTitle)

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
