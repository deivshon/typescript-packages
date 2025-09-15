import { Equals } from "@deivshon/types-toolkit"
import { describe, expectTypeOf, it } from "vitest"
import { InferOptionType, Option } from "./sync"

type T0U = unknown
type T0O = Option<T0U>
/**
 * ```txt
 * H1. let U
 * H2. let O = Option<U>
 *
 * Thesis: T0
 * InferOptionType<O> = U
 *
 * Proof:
 *   InferOptionType<O>
 * = InferOptionType<Option<U>> [H2]
 * = Option<U> extends Option<infer S> ? S : never [InferOptionType def]
 * = Option<U> extends Option<U> ? U : never [type inference]
 * = U [conditional type resolution]
 * ```
 */
type T0 = Equals<InferOptionType<T0O>, T0U>

type T1U = unknown
type T1O = Option<T1U>
/**
 * ```txt
 * H1. let U
 * H2. let O = Option<U>
 *
 * Thesis: T1
 * O = Option<InferOptionType<O>>
 *
 * Proof:
 *   Option<InferOptionType<O>>
 * = Option<InferOptionType<Option<U>>> [H2]
 * = Option<U> [T0]
 * = O [H2]
 * ```
 */
type T1 = Equals<T1O, Option<InferOptionType<T1O>>>

describe("type-level tests", () => {
    describe("T0", () => {
        it("should be true", () => {
            expectTypeOf<T0>().toEqualTypeOf<true>()
        })
    })

    describe("T1", () => {
        it("should be true", () => {
            expectTypeOf<T1>().toEqualTypeOf<true>()
        })
    })
})
