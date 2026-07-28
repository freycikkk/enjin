import globals from "globals";
import tslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { sortImportsByLength } from "./rules.eslintrc.js";
import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";

export default defineConfig([
  globalIgnores(["app", "electron", "out"]),
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-unused-expressions": "off",
      "custom/arrangeImports": "warn",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/consistent-type-imports": "warn",
    },
    plugins: { custom: { rules: { arrangeImports: sortImportsByLength } } },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: { ecmaVersion: "latest", ecmaFeatures: { jsx: true }, sourceType: "module" },
    },
    extends: [
      js.configs.recommended,
      reactRefresh.configs.vite,
      tslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
  },
]);
