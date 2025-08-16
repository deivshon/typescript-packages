import { Result, err, ok } from "./result"

export const trySync =
    <TArgs extends readonly unknown[], TReturn>(fn: (...args: TArgs) => TReturn) =>
    (...args: TArgs): Result<TReturn, unknown> => {
        try {
            return ok(fn(...args))
        } catch (error) {
            return err(error)
        }
    }

export const tryAsync =
    <TArgs extends readonly unknown[], TReturn>(fn: (...args: TArgs) => Promise<TReturn>) =>
    async (...args: TArgs): Promise<Result<TReturn, unknown>> => {
        try {
            return ok(await fn(...args))
        } catch (error) {
            return err(error)
        }
    }
