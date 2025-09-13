import { Options } from "tsdown"

export const baseTsDownConfig: Options = {
    sourcemap: false,
    minify: false,
    dts: true,
    format: ["esm", "cjs"],
    inputOptions: {
        resolve: undefined,
    },
}
