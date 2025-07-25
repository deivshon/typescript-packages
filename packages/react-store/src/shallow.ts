export const shallowEq = (a: Readonly<unknown>, b: Readonly<unknown>): boolean => {
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
        return Object.is(a, b)
    }
    if (a.constructor !== b.constructor) {
        return false
    }

    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
            return false
        }

        for (let idx = 0; idx < a.length; idx++) {
            if (!Object.is(a[idx], b[idx])) {
                return false
            }
        }

        return true
    }
    if (a instanceof Set || b instanceof Set) {
        if (!(a instanceof Set) || !(b instanceof Set) || a.size !== b.size) {
            return false
        }

        for (const value of a.values()) {
            if (!b.has(value)) {
                return false
            }
        }

        return true
    }

    if (a instanceof Map !== b instanceof Map) {
        return false
    }

    const aEntries: Map<unknown, unknown> = a instanceof Map ? a : new Map(Object.entries(a))
    const bEntries: Map<unknown, unknown> = b instanceof Map ? b : new Map(Object.entries(b))
    if (aEntries.size !== bEntries.size) {
        return false
    }

    for (const [aKey, aValue] of aEntries) {
        if (!Object.is(aValue, bEntries.get(aKey))) {
            return false
        }
    }

    return true
}
