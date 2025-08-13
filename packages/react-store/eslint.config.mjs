import { baseEsLintConfig } from "../../configs/eslint/eslint.config.base.mjs"
import { reactEsLintConfig } from "../../configs/eslint/eslint.config.react.mjs"

export default [...baseEsLintConfig, ...reactEsLintConfig]
