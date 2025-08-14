import { defineConfig } from "tsup"
import { baseTsUpConfig } from "../../configs/tsup/tsup.config.base"

export default defineConfig({
    ...baseTsUpConfig,
    entry: {
        index: "src/index.ts",
    },
})
