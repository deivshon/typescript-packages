export type ResultUnwrapErrorKind = "value" | "error"

export class ResultUnwrapError extends Error {
    kind: ResultUnwrapErrorKind

    constructor(kind: ResultUnwrapErrorKind) {
        super(`Tried unwrapping a${kind === "error" ? "n error" : " value"} but result did not have it`)
        this.name = "UnwrapError"
        this.kind = kind
    }
}

export const throwValueResultUnwrapError = () => {
    throw new ResultUnwrapError("value")
}
export const throwErrorResultUnwrapError = () => {
    throw new ResultUnwrapError("error")
}
