export const tap = <const TValue, const TReturn>(
    value: TValue,
    effect: (value: TValue) => unknown,
    build: (value: TValue) => TReturn,
) => {
    void effect(value)
    return build(value)
}
