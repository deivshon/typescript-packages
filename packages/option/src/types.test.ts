import { Equals } from "@deivshon/types-toolkit"
import { describe, expectTypeOf, it } from "vitest"
import { Option, OptionType } from "./sync"

type T0T = unknown
type T0O = Option<T0T>

/**
 * ```txt
 * Hypothesis:
 * - O = Option<T> for some T
 *
 * Thesis: T0 := OptionType<O> = T
 *
 * Proof:
 * -> OptionType<O> = T
 * -> Option<T> extends Option<infer U> ? U : never = T
 * -> Option<T> extends Option<T> ? T : never = T
 * -> T = T
 * ```
 */
type T0 = Equals<OptionType<T0O>, T0T>

type T1T = unknown
type T1O = Option<T1T>
/**
 * ```txt
 * Hypothesis:
 * - O = Option<T> for some T
 *
 * Thesis: T1 := O = Option<OptionType<O>>
 *
 * Proof:
 * -> O = Option<OptionType<O>>
 * -> Option<T> = Option<OptionType<Option<T>>>
 * -> Option<T> = Option<T> (T0)
 * ```
 */
type T1 = Equals<T1O, Option<OptionType<T1O>>>

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
