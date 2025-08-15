import { defineConfig } from "tsdown"

export default defineConfig({
    sourcemap: false,
    minify: true,
    dts: true,
    format: ["esm", "cjs"],
    entry: "src/index.ts",
})
