import { beforeEach, describe, expect, it } from "vitest"
import { err, errAsync, fromSafePromise, ok, okAsync, ResultAsync } from "../src"
import {
    asyncFn,
    asyncSafeguard,
    fromPromise,
    fromResultPromise,
    fromSafeResultPromise,
    safeAsyncFn,
    tryAsync,
} from "../src/async"
import { identity } from "../src/internal/utils"
import { errorKey, expectResultValuesEqual, valueKey } from "./common"

describe("async result", () => {
    const okValue = 42
    const errValue = "some error"

    let okResultPlain = okAsync(okValue)
    let errResultPlain = errAsync(errValue)
    let okResultFromPromise = fromSafePromise(Promise.resolve(okValue))
    let errResultFromPromise = fromPromise(Promise.reject(new Error()), () => errValue)
    let okResultFromResultPromise = fromSafeResultPromise(Promise.resolve(ok(okValue)))
    let errResultFromRejectedResultPromise = fromResultPromise<never, never, string>(
        Promise.reject(new Error()),
        () => errValue,
    )
    let errResultFromDirectResultPromise = fromSafeResultPromise(Promise.resolve(err(errValue)))

    const resetResults = () => {
        okResultPlain = okAsync(okValue)
        errResultPlain = errAsync(errValue)
        okResultFromPromise = fromSafePromise(Promise.resolve(okValue))
        errResultFromPromise = fromPromise(Promise.reject(new Error()), () => errValue)
        okResultFromResultPromise = fromSafeResultPromise(Promise.resolve(ok(okValue)))
        errResultFromRejectedResultPromise = fromResultPromise(Promise.reject(new Error()), () => errValue)
        errResultFromDirectResultPromise = fromSafeResultPromise(Promise.resolve(err(errValue)))
    }

    const okResults = [okResultPlain, okResultFromPromise, okResultFromResultPromise]
    const errResults: Array<ResultAsync<never, string>> = [
        errResultPlain,
        errResultFromPromise,
        errResultFromRejectedResultPromise,
        errResultFromDirectResultPromise,
    ]
    const allResults = [...okResults, ...errResults]

    beforeEach(resetResults)

    const expectNoOriginalValuesChange = async () => {
        for (const okResult of okResults) {
            expect(await okResult.dangerouslyUnwrap()).toBe(okValue)
        }
        for (const errResult of errResults) {
            expect(await errResult.dangerouslyUnwrapErr()).toBe(errValue)
        }
    }

    describe("okAsync", () => {
        it("should create an ok async value", async () => {
            for (const okResult of okResults) {
                expect(okResult.async).toBe(true)

                const awaitedOkResult = await okResult
                expect(awaitedOkResult.success).toBe(true)
                expect(valueKey in awaitedOkResult && awaitedOkResult[valueKey] === okValue).toBe(true)
                expect(errorKey in awaitedOkResult).toBe(false)
            }
        })
    })

    describe("errAsync", () => {
        it("should create an err async value", async () => {
            for (const errResult of errResults) {
                expect(errResult.async).toBe(true)

                const awaitedErrResult = await errResult
                expect(awaitedErrResult.success).toBe(false)
                expect(errorKey in awaitedErrResult && awaitedErrResult[errorKey] === errValue).toBe(true)
                expect(valueKey in awaitedErrResult).toBe(false)
            }
        })
    })

    describe("map", () => {
        it("should map the value of an ok value", async () => {
            for (const okResult of okResults) {
                expect(await okResult.map(String).dangerouslyUnwrap()).toBe(String(okValue))
            }
        })

        it("should leave an err value unchanged", async () => {
            for (const errResult of errResults) {
                expect(await errResult.map(String).dangerouslyUnwrapErr()).toBe(errValue)
            }
        })

        it("should leave the original result unchanged", async () => {
            for (const result of allResults) {
                void (await result.map(String))
            }

            await expectNoOriginalValuesChange()
        })
    })

    describe("mapErr", () => {
        it("should leave an ok value unchanged", async () => {
            for (const okResult of okResults) {
                expect(await okResult.mapErr(() => NaN).dangerouslyUnwrap()).toBe(okValue)
            }
        })

        const to = "some other error"
        it("should map the error of an err value", async () => {
            for (const errResult of errResults) {
                expect(await errResult.mapErr(() => to).dangerouslyUnwrapErr()).toBe(to)
            }
        })

        it("should leave the original result unchanged", async () => {
            for (const result of allResults) {
                void (await result.mapErr(() => to))
            }

            await expectNoOriginalValuesChange()
        })
    })

    describe("bind", () => {
        const toOkTransform = (value: number) => value + 1
        const toOk = (value: number) => (isNaN(value) ? errAsync(NaN) : okAsync(toOkTransform(value)))

        const toErrError = "error"
        const toErr = (value: number) => (!isNaN(value) ? errAsync(toErrError) : okAsync(value + 1))

        it("should transform an ok value to either an ok value or an err value", async () => {
            for (const okResult of okResults) {
                expect(await okResult.bind(toOk).dangerouslyUnwrap()).toBe(toOkTransform(okValue))
                expect(await okResult.bind(toErr).dangerouslyUnwrapErr()).toBe(toErrError)
            }
        })

        it("should leave an err value unchanged", async () => {
            for (const errResult of errResults) {
                expect(await errResult.bind(toOk).dangerouslyUnwrapErr()).toBe(errValue)
                expect(await errResult.bind(toErr).dangerouslyUnwrapErr()).toBe(errValue)
            }
        })

        it("should leave the original result unchanged", async () => {
            for (const result of allResults) {
                void (await result.map(toOk))
                void (await result.map(toErr))
            }

            await expectNoOriginalValuesChange()
        })
    })

    describe("bindErr", () => {
        const toOkValue = null
        const toOk = (error: string) => (error.length === 0 ? errAsync(NaN) : okAsync(toOkValue))

        const toErrError = "non-zero length error"
        const toErr = (error: string) => (error.length !== 0 ? errAsync(toErrError) : okAsync(null))

        it("should leave an ok value unchanged", async () => {
            for (const okResult of okResults) {
                expect(await okResult.bindErr(toOk).dangerouslyUnwrap()).toBe(okValue)
                expect(await okResult.bindErr(toErr).dangerouslyUnwrap()).toBe(okValue)
            }
        })

        it("should transform an err value to either an ok value or an err value", async () => {
            for (const errResult of errResults) {
                expect(await errResult.bindErr(toOk).dangerouslyUnwrap()).toBe(toOkValue)
                expect(await errResult.bindErr(toErr).dangerouslyUnwrapErr()).toBe(toErrError)
            }
        })

        it("should leave the original result unchanged", async () => {
            for (const result of allResults) {
                void (await result.bindErr(toOk))
                void (await result.bindErr(toErr))
            }

            await expectNoOriginalValuesChange()
        })
    })

    {
        let mutable = 0
        const resetMutable = () => {
            mutable = 0
        }

        beforeEach(resetMutable)
        const setMutableTo1 = () => {
            mutable = 1
        }

        describe("tap", () => {
            it("should run the effect on an ok value and leave it unchanged", async () => {
                for (const okResult of okResults) {
                    expect(mutable).toBe(0)

                    const tapped = await okResult.tap(setMutableTo1)

                    expect(mutable).toBe(1)
                    expectResultValuesEqual(await okResult, tapped)

                    resetMutable()
                }
            })

            it("should not run the effect on an err value and leave it unchanged", async () => {
                for (const errResult of errResults) {
                    const tapped = await errResult.tap(setMutableTo1)

                    expect(mutable).toBe(0)
                    expectResultValuesEqual(await errResult, tapped)
                }
            })

            it("should leave the original result unchanged", async () => {
                for (const result of allResults) {
                    void (await result.tap(setMutableTo1))
                }

                await expectNoOriginalValuesChange()
            })
        })

        describe("tapErr", () => {
            it("should not run the effect on an ok value and leave it unchanged", async () => {
                for (const okResult of okResults) {
                    const tapped = await okResult.tapErr(setMutableTo1)

                    expect(mutable).toBe(0)
                    expectResultValuesEqual(await okResult, tapped)
                }
            })

            it("should run the effect on an err value and leave it unchanged", async () => {
                for (const errResult of errResults) {
                    expect(mutable).toBe(0)

                    const tapped = await errResult.tapErr(setMutableTo1)

                    expect(mutable).toBe(1)
                    expectResultValuesEqual(await errResult, tapped)

                    resetMutable()
                }
            })

            it("should leave the original result unchanged", async () => {
                for (const result of allResults) {
                    void (await result.tapErr(setMutableTo1))
                }

                await expectNoOriginalValuesChange()
            })
        })

        describe("through", () => {
            const toOkValue = 1
            const setMutableToOk = (): ResultAsync<null, string> => {
                mutable = toOkValue
                return okAsync(null)
            }

            const toErrValue = 2
            const setMutableToErr = (): ResultAsync<string, null> => {
                mutable = toErrValue
                return errAsync(null)
            }

            it("should run an ok-returning effect on an ok value and leave it unchanged", async () => {
                for (const okResult of okResults) {
                    expect(mutable).toBe(0)

                    const through = await okResult.through(setMutableToOk)

                    expect(mutable).toBe(toOkValue)
                    expectResultValuesEqual(await okResult, through)

                    resetMutable()
                }
            })
            it("should run an error-returning effect on an ok value and return the effect's error value", async () => {
                for (const okResult of okResults) {
                    expect(mutable).toBe(0)

                    const through = await okResult.through(setMutableToErr)

                    expect(mutable).toBe(toErrValue)
                    expect(through.dangerouslyUnwrapErr()).toBe(null)

                    resetMutable()
                }
            })

            it("should not run the effect on an err value and leave it unchanged", async () => {
                for (const errResult of errResults) {
                    const through1 = await errResult.through(setMutableToOk)
                    const through2 = await errResult.through(setMutableToErr)

                    expect(mutable).toBe(0)
                    expectResultValuesEqual(await errResult, through1)
                    expectResultValuesEqual(await errResult, through2)
                }
            })

            it("should leave the original result unchanged", async () => {
                for (const result of allResults) {
                    void (await result.through(setMutableToOk))
                }

                await expectNoOriginalValuesChange()
            })
        })
    }

    describe("unwrapOr", () => {
        it("should return the value of the ok value being called on", async () => {
            for (const okResult of okResults) {
                expect(await okResult.unwrapOr(NaN)).toBe(okValue)
            }
        })

        it("should return the passed value when called on an err value", async () => {
            for (const errResult of errResults) {
                expect(await errResult.unwrapOr(true)).toBe(true)
            }
        })
    })

    describe("unwrapOrFrom", () => {
        it("should return the value of the ok value being called on", async () => {
            for (const okResult of okResults) {
                expect(await okResult.unwrapOrFrom(() => NaN)).toBe(okValue)
            }
        })

        it("should return the value computed from the error when called on an err value", async () => {
            for (const errResult of errResults) {
                expect(await errResult.unwrapOrFrom((error) => error + "XYZ")).toBe(errValue + "XYZ")
            }
        })
    })

    describe("dangerouslyUnwrap", () => {
        it("should return the value of the ok value being called on", async () => {
            for (const okResult of okResults) {
                expect(await okResult.dangerouslyUnwrap()).toBe(okValue)
            }
        })

        it("should throw when called on an err value", async () => {
            for (const errResult of errResults) {
                await expect(errResult.dangerouslyUnwrap()).rejects.toThrow()
            }
        })
    })

    describe("dangerouslyUnwrapErr", () => {
        it("should throw when called on an ok value", async () => {
            for (const okResult of okResults) {
                await expect(okResult.dangerouslyUnwrapErr()).rejects.toThrow()
            }
        })

        it("should return the error of the err value being called on", async () => {
            for (const errResult of errResults) {
                expect(await errResult.dangerouslyUnwrapErr()).toBe(errValue)
            }
        })
    })
})

describe("async result utilities", async () => {
    const transform = (n: number) => n + 1

    const expectFunctionToProduceResultAsync = async (fn: (n: number) => ResultAsync<number, unknown>) => {
        const result = fn(0)
        expect(result.async).toBe(true)

        const awaitedResult = await result
        expect(awaitedResult.async).toBe(false)
        expect(awaitedResult.dangerouslyUnwrap()).toBe(transform(0))
    }

    describe("asyncFn", () => {
        it("should create a function returning an async result given a promise-returning function", async () => {
            const fn = asyncFn(async (n: number) => {
                await Promise.resolve()
                return ok(transform(n))
            })

            await expectFunctionToProduceResultAsync(fn)
        })

        it("should create a function returning an async result given an async result returning function", async () => {
            const fn = asyncFn((n: number) => okAsync(transform(n)))

            await expectFunctionToProduceResultAsync(fn)
        })

        it("should create a function returning an async result given a sync result returning function", async () => {
            const fn = asyncFn((n: number) => ok(transform(n)))

            await expectFunctionToProduceResultAsync(fn)
        })

        it("should not handle thrown errors", async () => {
            const fn = asyncFn((_: number) => {
                throw new Error()
            })

            await expect(async () => await fn(0)).rejects.toThrow()
        })
    })

    describe("safeAsyncFn", () => {
        it("should create a function returning an async result given a promise-returning function", async () => {
            const fn = safeAsyncFn(async (n: number) => {
                await Promise.resolve()
                return ok(transform(n))
            }, identity)

            await expectFunctionToProduceResultAsync(fn)
        })

        it("should create a function returning an async result given an async result returning function", async () => {
            const fn = safeAsyncFn((n: number) => okAsync(transform(n)), identity)

            await expectFunctionToProduceResultAsync(fn)
        })

        it("should create a function returning an async result given a sync result returning function", async () => {
            const fn = safeAsyncFn((n: number) => ok(transform(n)), identity)

            await expectFunctionToProduceResultAsync(fn)
        })

        it("should handle thrown errors", async () => {
            const error = new Error()
            const fn = safeAsyncFn((_: number) => {
                throw error
            }, identity)

            expect(() => fn(0)).not.toThrow()
            expect(await fn(0).dangerouslyUnwrapErr()).toBe(error)
        })
    })

    {
        const jsonParse = async (value: string): Promise<unknown> => {
            await Promise.resolve()
            return JSON.parse(value)
        }

        const notJson = "{a:"
        await expect(async () => await jsonParse(notJson)).rejects.toThrow()

        describe("tryAsync", () => {
            it("should wrap the return value of the passed in function in a result, returning an error in case of a throw", async () => {
                await expect(tryAsync(async () => await jsonParse(notJson))).resolves.toBeDefined()
                expect(await tryAsync(async () => await jsonParse(notJson)).dangerouslyUnwrapErr()).toBeInstanceOf(
                    SyntaxError,
                )
            })

            it("should protect from synchronously thrown errors in the promise creation function", async () => {
                const synchronouslyThrowing = (): Promise<number> => {
                    if ((() => true)()) {
                        throw new Error()
                    }

                    return new Promise((resolve) => {
                        resolve(1)
                    })
                }

                await expect(tryAsync(synchronouslyThrowing)).resolves.toBeDefined()
            })
        })

        describe("asyncSafeguard", () => {
            it("should safeguard the function passed in by returning an err value in case of a throw", async () => {
                const safeguardedJsonParse = asyncSafeguard(async (value: string): Promise<unknown> => {
                    await Promise.resolve()
                    return JSON.parse(value)
                })

                await expect(safeguardedJsonParse(notJson)).resolves.toBeDefined()
                expect(await safeguardedJsonParse(notJson).dangerouslyUnwrapErr()).toBeInstanceOf(SyntaxError)
            })
        })
    }
})

describe("result async object", () => {
    it("should have the proper async utilities assigned", () => {
        expect(ResultAsync.ok).toBe(okAsync)
        expect(ResultAsync.err).toBe(errAsync)
        expect(ResultAsync.fn).toBe(asyncFn)
        expect(ResultAsync.safeFn).toBe(safeAsyncFn)
        expect(ResultAsync.try).toBe(tryAsync)
        expect(ResultAsync.safeguard).toBe(asyncSafeguard)
        expect(ResultAsync.fromPromise).toBe(fromPromise)
        expect(ResultAsync.fromSafePromise).toBe(fromSafePromise)
        expect(ResultAsync.fromResultPromise).toBe(fromResultPromise)
        expect(ResultAsync.fromSafeResultPromise).toBe(fromSafeResultPromise)
    })
})
