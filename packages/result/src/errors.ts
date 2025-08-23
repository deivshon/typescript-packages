type UnwrapErrorKind = "value" | "error"

export class UnwrapError extends Error {
    kind: UnwrapErrorKind

    constructor(kind: UnwrapErrorKind) {
        super(`Tried unwrapping a${kind === "error" ? "n error" : " value"} but result did not have it`)
        this.name = "UnwrapError"
        this.kind = kind
    }
}
