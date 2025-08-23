import { defineConfig } from "tsdown"

export default defineConfig({
    sourcemap: false,
    minify: false,
    dts: true,
    format: ["esm", "cjs"],
    entry: "src/index.ts",
})
