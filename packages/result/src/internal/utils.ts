export const identity = <const T>(value: T) => value

export const syncCatchAndIgnore = (fn: () => void) => {
    try {
        fn()
    } catch {
        // Ignore
    }
}

export const asyncCatchAndIgnore = async (fn: () => Promise<unknown>) => {
    try {
        await fn()
    } catch {
        // Ignore
    }
}
