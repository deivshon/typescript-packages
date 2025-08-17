export const brandedError = <T>() => {
    class BrandedError extends Error {
        value: T

        constructor(value: T, message: string) {
            super(message)
            this.value = value
        }
    }

    return [
        (value: T, message: string) => new BrandedError(value, message),
        (value: unknown): value is BrandedError => value instanceof BrandedError,
    ] as const
}
