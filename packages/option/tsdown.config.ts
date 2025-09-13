import { baseTsDownConfig } from "@build/tsdown-configs"
import { defineConfig } from "tsdown"

export default defineConfig({
    ...baseTsDownConfig,
    entry: "src/index.ts",
})
