export const identity = <const T>(value: T) => value

export const anonymousError = <T>() => {
    class AnonymousError extends Error {
        value: T

        constructor(value: T) {
            super("")
            this.value = value
        }
    }

    return [
        (value: T) => new AnonymousError(value),
        (value: unknown): value is AnonymousError => value instanceof AnonymousError,
    ] as const
}
