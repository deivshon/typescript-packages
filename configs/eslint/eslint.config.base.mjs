import js from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"

export const baseEsLintConfig = tseslint.config(
    {
        ignores: ["tsconfig.json", "tsdown.config.ts", "dist", "eslint.config.mjs"],
    },
    {
        files: ["**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"],
        languageOptions: {
            globals: {
                ...globals.serviceworker,
                ...globals.browser,
            },
        },
    },
    {
        extends: [
            js.configs.recommended,
            ...tseslint.configs.strictTypeChecked,
            ...tseslint.configs.stylisticTypeChecked,
        ],
        files: ["**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"],
        languageOptions: {
            ecmaVersion: 2018,
            globals: globals.browser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            curly: "error",
            "@typescript-eslint/consistent-indexed-object-style": "off",
            "@typescript-eslint/no-unnecessary-type-parameters": "off",
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/prefer-optional-chain": "off",
            "@typescript-eslint/consistent-type-definitions": "off",
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            "@typescript-eslint/array-type": ["error", { default: "array-simple" }],
            "@typescript-eslint/prefer-nullish-coalescing": [
                "error",
                {
                    ignorePrimitives: true,
                },
            ],
        },
    },
)
