import { Result, ResultAsync, err, fromPromise, ok } from "./result"

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
    (...args: TArgs): ResultAsync<TReturn, unknown> =>
        fromPromise(fn(...args), (error) => error)
