import { Options } from "tsup"

export const baseTsUpConfig: Options = {
    sourcemap: false,
    minify: true,
    dts: true,
    format: ["esm", "cjs"],
    bundle: true,
}
