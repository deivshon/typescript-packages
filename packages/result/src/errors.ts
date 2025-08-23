export type UnwrapErrorKind = "value" | "error"

export class UnwrapError extends Error {
    kind: UnwrapErrorKind

    constructor(kind: UnwrapErrorKind) {
        super(`Tried unwrapping a${kind === "error" ? "n error" : " value"} but result did not have it`)
        this.name = "UnwrapError"
        this.kind = kind
    }
}

export const throwValueUnwrapError = () => {
    throw new UnwrapError("value")
}
export const throwErrorUnwrapError = () => {
    throw new UnwrapError("error")
}

export const rejectWithValueUnwrapError = () => Promise.reject(new UnwrapError("value"))
export const rejectWithErrorUnwrapError = () => Promise.reject(new UnwrapError("error"))
