import z from "zod"

export const profileSchema = z.object({
    age: z.number(),
    name: z.string(),
    notes: z.array(
        z.object({
            value: z.string(),
            createdAt: z.string(),
        }),
    ),
})
export type Profile = z.infer<typeof profileSchema>

export const makeRandomProfile = (): Profile => ({
    age: Math.floor(Math.random() * 100),
    name: Math.random() > 0.5 ? "Davide" : "Marco",
    notes: Array.from({ length: Math.floor(Math.random() * 2) }).map((_, idx) => ({
        createdAt: new Date().toISOString(),
        value: `Note no. ${idx + 1}`,
    })),
})
export const defaultProfile: Profile = {
    age: 0,
    name: "Default",
    notes: [],
}
