import { beforeEach, describe, expect, it } from "vitest"
import { err, ok, Result, safeSyncFn, syncFn, syncSafeguard, trySync } from "../src"
import { expectResultValuesEqual } from "./common"

describe("sync result", () => {
    const okValue = 42
    const errValue = "some error"

    let okResult = ok(okValue)
    let errResult = err(errValue)

    beforeEach(() => {
        okResult = ok(okValue)
        errResult = err(errValue)
    })

    const emptyPromise = Promise.resolve(null)

    const expectNoOriginalValuesChange = () => {
        expect(okResult.dangerouslyUnwrap()).toBe(okValue)
        expect(errResult.dangerouslyUnwrapErr()).toBe(errValue)
    }

    describe("ok", () => {
        it("should create a sync ok value", () => {
            expect(okResult.async).toBe(false)
            expect(okResult.success).toBe(true)
            expect(okResult.dangerouslyUnwrap()).toBe(okValue)
            expect(okResult.dangerouslyUnwrapErr).toThrow()
        })
    })

    describe("err", () => {
        it("should create a sync err value", () => {
            expect(errResult.async).toBe(false)
            expect(errResult.success).toBe(false)
            expect(errResult.dangerouslyUnwrap).toThrow()
            expect(errResult.dangerouslyUnwrapErr()).toBe(errValue)
        })
    })

    describe("map", () => {
        it("should map the value of an ok value", () => {
            expect(okResult.map(String).dangerouslyUnwrap()).toBe(String(okValue))
        })

        it("should leave an err value unchanged", () => {
            expect(errResult.map(String).dangerouslyUnwrapErr()).toBe(errValue)
        })

        it("should leave the original result unchanged", () => {
            void okResult.map(String)
            void errResult.map(String)

            expectNoOriginalValuesChange()
        })
    })

    describe("mapErr", () => {
        it("should leave an ok value unchanged", () => {
            expect(okResult.mapErr(() => NaN).dangerouslyUnwrap()).toBe(okValue)
        })

        const to = "some other error"
        it("should map the error of an err value", () => {
            expect(errResult.mapErr(() => to).dangerouslyUnwrapErr()).toBe(to)
        })

        it("should leave the original result unchanged", () => {
            void okResult.mapErr(() => to)
            void errResult.mapErr(() => to)

            expectNoOriginalValuesChange()
        })
    })

    describe("asyncMap", () => {
        const mapper = async (value: number) => {
            await emptyPromise
            return String(value)
        }

        it("should map the value of an ok value to an asyncResult", async () => {
            const okAsyncMapped = okResult.asyncMap(mapper)

            expect(okAsyncMapped.async).toBe(true)
            expect((await okAsyncMapped).dangerouslyUnwrap()).toBe(String(okValue))
        })

        it("should leave an err value unchanged (aside from making it an async result)", async () => {
            const errAsyncMapped = errResult.asyncMap(mapper)

            expect(errAsyncMapped.async).toBe(true)
            expect((await errAsyncMapped).dangerouslyUnwrapErr()).toBe(errValue)
        })

        it("should leave the original result unchanged", async () => {
            void (await okResult.asyncMap(mapper))
            void (await errResult.asyncMap(mapper))

            expectNoOriginalValuesChange()
        })
    })

    describe("bind", () => {
        const toOk = (value: number) => (isNaN(value) ? err("NaN") : ok(value + 1))
        const toErr = (value: number) => (!isNaN(value) ? err("not NaN") : ok(value + 1))

        it("should transform an ok value to either an ok value or an err value", () => {
            const okBoundResult = okResult.bind(toOk)
            const errBoundResult = okResult.bind(toErr)

            expect(okBoundResult.dangerouslyUnwrap()).toBe(okValue + 1)
            expect(errBoundResult.dangerouslyUnwrapErr()).toBe("not NaN")
        })

        it("should leave an err value unchanged", () => {
            const errBoundResult1 = errResult.bind(toOk)
            const errBoundResult2 = errResult.bind(toErr)

            expect(errBoundResult1.dangerouslyUnwrapErr()).toBe(errValue)
            expect(errBoundResult2.dangerouslyUnwrapErr()).toBe(errValue)
        })

        it("should leave the original result unchanged", () => {
            void okResult.bind(toOk)
            void errResult.bind(toOk)

            expectNoOriginalValuesChange()
        })
    })

    describe("bindErr", () => {
        const toOk = (error: string) => (error.length === 0 ? err("zero length error") : ok(null))
        const toErr = (error: string) => (error.length !== 0 ? err("non-zero length error") : ok(null))

        it("should leave an ok value unchanged", () => {
            const okBoundResult1 = okResult.bindErr(toOk)
            const errBoundResult2 = okResult.bindErr(toErr)

            expect(okBoundResult1.dangerouslyUnwrap()).toBe(okValue)
            expect(errBoundResult2.dangerouslyUnwrap()).toBe(okValue)
        })

        it("should transform an err value to either an ok value or an err value", () => {
            const okBoundResult = errResult.bindErr(toOk)
            const errBoundResult = errResult.bindErr(toErr)

            expect(okBoundResult.dangerouslyUnwrap()).toBe(null)
            expect(errBoundResult.dangerouslyUnwrapErr()).toBe("non-zero length error")
        })

        it("should leave the original result unchanged", () => {
            void okResult.bindErr(toOk)
            void errResult.bindErr(toOk)

            expectNoOriginalValuesChange()
        })
    })

    describe("asyncBind", () => {
        const toOk = (value: number) => Promise.resolve(isNaN(value) ? err("NaN") : ok(value + 1))
        const toErr = (value: number) => Promise.resolve(!isNaN(value) ? err("not NaN") : ok(value + 1))

        it("should transform an ok value to either an async ok value or an async err value", async () => {
            const okBoundResult = okResult.asyncBind(toOk)
            const errBoundResult = okResult.asyncBind(toErr)

            expect(okBoundResult.async).toBe(true)
            expect(errBoundResult.async).toBe(true)
            expect(await okBoundResult.dangerouslyUnwrap()).toBe(okValue + 1)
            expect(await errBoundResult.dangerouslyUnwrapErr()).toBe("not NaN")
        })

        it("should leave an err value unchanged (aside from making it an async result)", async () => {
            const errBoundResult1 = errResult.asyncBind(toOk)
            const errBoundResult2 = errResult.asyncBind(toErr)

            expect(errBoundResult1.async).toBe(true)
            expect(errBoundResult2.async).toBe(true)
            expect(await errBoundResult1.dangerouslyUnwrapErr()).toBe(errValue)
            expect(await errBoundResult2.dangerouslyUnwrapErr()).toBe(errValue)
        })

        it("should leave the original result unchanged", async () => {
            void (await okResult.asyncBind(toOk))
            void (await errResult.asyncBind(toOk))

            expectNoOriginalValuesChange()
        })
    })

    {
        let mutable = 0
        beforeEach(() => {
            mutable = 0
        })

        describe("tap", () => {
            const setMutableTo1 = () => {
                mutable = 1
            }

            it("should run the effect on an ok value and leave it unchanged", () => {
                const tappedOkResult = okResult.tap(setMutableTo1)

                expectResultValuesEqual(okResult, tappedOkResult)
                expect(mutable).toBe(1)
            })

            it("should not run the effect on an err value and leave it unchanged", () => {
                const tappedErrResult = errResult.tap(setMutableTo1)

                expectResultValuesEqual(errResult, tappedErrResult)
                expect(mutable).toBe(0)
            })

            it("should leave the original result unchanged", () => {
                void okResult.tap(setMutableTo1)
                void errResult.tap(setMutableTo1)

                expectNoOriginalValuesChange()
            })
        })

        describe("tapErr", () => {
            const setMutableTo1 = () => {
                mutable = 1
            }

            it("should not run the effect on an ok value and leave it unchanged", () => {
                const tappedOkResult = okResult.tapErr(setMutableTo1)

                expectResultValuesEqual(okResult, tappedOkResult)
                expect(mutable).toBe(0)
            })

            it("should run the effect on an err value and leave it unchanged", () => {
                const tappedErrResult = errResult.tapErr(setMutableTo1)

                expectResultValuesEqual(errResult, tappedErrResult)
                expect(mutable).toBe(1)
            })

            it("should leave the original result unchanged", () => {
                void okResult.tapErr(setMutableTo1)
                void errResult.tapErr(setMutableTo1)

                expectNoOriginalValuesChange()
            })
        })

        describe("through", () => {
            const setMutableTo1Ok = (): Result<null, string> => {
                mutable = 1
                return ok(null)
            }
            const setMutableTo1Err = (): Result<string, null> => {
                mutable = 1
                return err(null)
            }

            it("should run an ok-returning effect on an ok value and leave it unchanged", () => {
                const throughOkResult = okResult.through(setMutableTo1Ok)

                expectResultValuesEqual(okResult, throughOkResult)
                expect(mutable).toBe(1)
            })
            it("should run an error-returning effect on an ok value and return the effect's error value", () => {
                const throughErrResult = okResult.through(setMutableTo1Err)

                expect(throughErrResult.dangerouslyUnwrapErr()).toBe(null)
                expect(mutable).toBe(1)
            })

            it("should not run the effect on an err value and leave it unchanged", () => {
                const throughErrResult1 = errResult.through(setMutableTo1Ok)
                const throughErrResult2 = errResult.through(setMutableTo1Err)

                expectResultValuesEqual(errResult, throughErrResult1)
                expectResultValuesEqual(errResult, throughErrResult2)
                expect(mutable).toBe(0)
            })

            it("should leave the original result unchanged", () => {
                void okResult.through(setMutableTo1Ok)
                void errResult.through(setMutableTo1Ok)

                expectNoOriginalValuesChange()
            })
        })

        describe("asyncThrough", () => {
            const asyncSetMutableTo1Ok = async (): Promise<Result<null, string>> => {
                mutable = 1
                await emptyPromise
                return ok(null)
            }
            const asyncSetMutableTo1Err = async (): Promise<Result<string, null>> => {
                mutable = 1
                await emptyPromise
                return err(null)
            }

            it("should run an ok-returning effect on an ok value and leave it unchanged (aside from making it async)", async () => {
                const throughOkResult = await okResult.asyncThrough(asyncSetMutableTo1Ok)

                expectResultValuesEqual(okResult, throughOkResult)
                expect(mutable).toBe(1)
            })
            it("should run an error-returning effect on an ok value and return the effect's async error value", async () => {
                const throughErrResult = await okResult.asyncThrough(asyncSetMutableTo1Err)

                expect(throughErrResult.dangerouslyUnwrapErr()).toBe(null)
                expect(mutable).toBe(1)
            })

            it("should not run the effect on an err value and leave it unchanged (aside from making it async)", async () => {
                const throughErrResult1 = await errResult.asyncThrough(asyncSetMutableTo1Ok)
                const throughErrResult2 = await errResult.asyncThrough(asyncSetMutableTo1Err)

                expectResultValuesEqual(errResult, throughErrResult1)
                expectResultValuesEqual(errResult, throughErrResult2)
                expect(mutable).toBe(0)
            })

            it("should leave the original result unchanged", async () => {
                void (await okResult.asyncThrough(asyncSetMutableTo1Ok))
                void (await errResult.asyncThrough(asyncSetMutableTo1Ok))

                expectNoOriginalValuesChange()
            })
        })
    }

    describe("unwrapOr", () => {
        it("should return the value of the ok value being called on", () => {
            expect(okResult.unwrapOr(NaN)).toBe(okValue)
        })

        it("should return the passed value when called on an err value", () => {
            expect(errResult.unwrapOr(true)).toBe(true)
        })
    })

    describe("unwrapOrFrom", () => {
        it("should return the value of the ok value being called on", () => {
            expect(okResult.unwrapOrFrom(() => NaN)).toBe(okValue)
        })

        it("should return the value computed from the error when called on an err value", () => {
            expect(errResult.unwrapOrFrom((error) => error + "XYZ")).toBe(errValue + "XYZ")
        })
    })

    describe("dangerouslyUnwrap", () => {
        it("should return the value of the ok value being called on", () => {
            expect(okResult.dangerouslyUnwrap()).toBe(okValue)
        })

        it("should throw when called on an err value", () => {
            expect(errResult.dangerouslyUnwrap).toThrow()
        })
    })

    describe("dangerouslyUnwrapErr", () => {
        it("should throw when called on an ok value", () => {
            expect(okResult.dangerouslyUnwrapErr).toThrow()
        })

        it("should return the error of the err value being called on", () => {
            expect(errResult.dangerouslyUnwrapErr()).toBe(errValue)
        })
    })
})

describe("sync result utilities", () => {
    const nonThrowingFn = (a: number, b: number) => {
        if (isNaN(a) || isNaN(b)) {
            return err("NaN")
        } else {
            return ok(a + b)
        }
    }
    const throwingFn = () => {
        if (Math.random() > -1) {
            throw new Error()
        }

        return ok(42)
    }

    describe("syncFn", () => {
        it("should return an equivalent function to the one passed in", () => {
            const processedFn = syncFn(nonThrowingFn)

            const originalResult1 = nonThrowingFn(1, 2)
            const originalResult2 = nonThrowingFn(1, NaN)
            const processedResult1 = processedFn(1, 2)
            const processedResult2 = processedFn(1, NaN)

            expectResultValuesEqual(originalResult1, processedResult1)
            expectResultValuesEqual(processedResult2, originalResult2)
        })

        it("should not protect from throws inside the original function", () => {
            const processedFn = syncFn(throwingFn)
            expect(processedFn).toThrow()
        })
    })

    describe("safeSyncFn", () => {
        it("should return an equivalent function to the one passed in if it doesn't throw", () => {
            const processedFn = safeSyncFn(nonThrowingFn, () => "threw" as const)

            const originalResult1 = nonThrowingFn(1, 2)
            const originalResult2 = nonThrowingFn(1, NaN)
            const processedResult1 = processedFn(1, 2)
            const processedResult2 = processedFn(1, NaN)

            expectResultValuesEqual(originalResult1, processedResult1)
            expectResultValuesEqual(processedResult2, originalResult2)
        })

        it("should protect from throws inside the original function, returning an err value with the handled error", () => {
            const processedFn = safeSyncFn(throwingFn, () => "threw" as const)
            const processedResult = processedFn()

            expect(processedResult.dangerouslyUnwrapErr()).toBe("threw")
        })
    })

    {
        const jsonParse = (value: string): unknown => JSON.parse(value)
        const notJson = "{a:"
        expect(() => jsonParse(notJson)).toThrow()

        describe("trySync", () => {
            it("should wrap the return value of the passed in function in a result, returning an error in case of a throw", () => {
                expect(() => trySync(() => jsonParse(notJson))).not.toThrow()
                expect(trySync(() => jsonParse(notJson)).dangerouslyUnwrapErr()).toBeInstanceOf(SyntaxError)
            })
        })

        describe("syncSafeguard", () => {
            it("should safeguard the function passed in by returning an err value in case of a throw", () => {
                const safeguardedJsonParse = syncSafeguard(JSON.parse)

                expect(() => safeguardedJsonParse(notJson)).not.toThrow()
                expect(safeguardedJsonParse(notJson).dangerouslyUnwrapErr()).toBeInstanceOf(SyntaxError)
            })
        })
    }
})

describe("result object", () => {
    it("should have the proper sync utilities assigned", () => {
        expect(Result.ok).toBe(ok)
        expect(Result.err).toBe(err)
        expect(Result.fn).toBe(syncFn)
        expect(Result.safeFn).toBe(safeSyncFn)
        expect(Result.try).toBe(trySync)
        expect(Result.safeguard).toBe(syncSafeguard)
    })
})
