import { type } from "arktype"

export const movieSchema = type({
    length: "number | null",
    name: "string",
    notes: type({
        id: "string",
        value: "string",
    }).array(),
})
export type Movie = typeof movieSchema.infer

export const makeRandomMovie = (): Movie => ({
    length: Math.random() > 0.5 ? Math.floor(Math.random() * 180) : null,
    name: Math.random() > 0.5 ? "Inception" : "Interstellar",
    notes: Array.from({ length: Math.floor(Math.random() * 2) }).map((_, idx) => ({
        id: crypto.randomUUID(),
        value: `Note ${idx + 1}`,
    })),
})
