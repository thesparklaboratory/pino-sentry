import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import * as unusedImports from "eslint-plugin-unused-imports";

export default tseslint.config(
  { languageOptions: { globals: globals.node, sourceType: "module" } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    ignores: ["node_modules", "dist"],
    plugins: {
      "unused-imports": unusedImports,
    },
  },
);