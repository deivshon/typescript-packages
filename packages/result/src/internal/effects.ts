export const tap = <const TValue, const TEffectReturn, const TDerivedFromEffectReturn, const TReturn>(
    value: TValue,
    effect: (value: TValue) => TEffectReturn,
    derive: (effectReturn: TEffectReturn) => TDerivedFromEffectReturn,
    build: (derived: TDerivedFromEffectReturn) => TReturn,
) => build(derive(effect(value)))
