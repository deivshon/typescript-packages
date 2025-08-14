import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import tseslint from "typescript-eslint"

export const reactEsLintConfig = tseslint.config(
    {
        settings: {
            react: {
                version: "detect",
            },
        },
        files: ["**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"],
        ...react.configs.flat.recommended,
        languageOptions: react.configs.flat.recommended.languageOptions,
        rules: react.configs.recommended.rules,
    },
    {
        files: ["**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"],
        plugins: {
            "react-hooks": reactHooks,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "error",
            "react/react-in-jsx-scope": "off",
        },
    },
)
