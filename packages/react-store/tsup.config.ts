import { defineConfig } from "tsup"

export default defineConfig({
    entry: {
        index: "src/index.ts",
        persist: "src/middleware/persist/index.ts",
    },
    sourcemap: false,
    minify: true,
    dts: true,
    format: ["esm", "cjs"],
    bundle: true,
})
