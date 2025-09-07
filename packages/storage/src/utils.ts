export const valueFromStorage = (value: unknown): Partial<Record<string, string>> => {
    if (typeof value !== "object" || value === null) {
        return {}
    }

    const result: Partial<Record<string, string>> = {}
    for (const [k, v] of Object.entries(value)) {
        if (typeof v !== "string") {
            continue
        }

        result[k] = v
    }

    return result
}
