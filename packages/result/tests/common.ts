import { expect } from "vitest"
import { Result } from "../src"

export const valueKey = "value"
export const errorKey = "error"

export const expectResultValuesEqual = (a: Result<unknown, unknown>, b: Result<unknown, unknown>) => {
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
}
