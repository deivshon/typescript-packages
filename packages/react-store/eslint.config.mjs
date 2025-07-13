import js from "@eslint/js"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
    {
        ignores: ["eslint.config.mjs", "tsconfig.json", "tsup.config.ts", "dist"],
    },
    {
        settings: {
            react: {
                version: "detect",
            },
        },
        files: ["**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"],
        ...react.configs.flat.recommended,
        languageOptions: {
            ...react.configs.flat.recommended.languageOptions,
            globals: {
                ...globals.serviceworker,
                ...globals.browser,
            },
        },
        rules: react.configs.recommended.rules,
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
        plugins: {
            "react-hooks": reactHooks,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            curly: "error",
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "error",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/consistent-indexed-object-style": "off",
            "@typescript-eslint/no-unnecessary-type-parameters": "off",
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/prefer-optional-chain": "off",
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            "@typescript-eslint/consistent-type-definitions": ["error", "type"],
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
