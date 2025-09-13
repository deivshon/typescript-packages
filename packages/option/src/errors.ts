export class OptionUnwrapError extends Error {
    constructor() {
        super(`Tried unwrapping a none option`)
        this.name = "OptionUnwrapError"
    }
}

export const throwNoneOptionUnwrapError = (): never => {
    throw new OptionUnwrapError()
}
