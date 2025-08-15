import { Options } from "tsdown"

export const baseTsDownConfig: Options = {
    sourcemap: false,
    minify: true,
    dts: true,
    format: ["esm", "cjs"],
}
