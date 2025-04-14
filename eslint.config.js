import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import prettierPlugin from "eslint-plugin-prettier";

export default [
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.d.ts"],
    ignores: ["node_modules/**", "dist/**"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json"
      },
      globals: {
        process: true,
        console: true,
        fetch: true,
        global: true,
        PACKAGE_VERSION: true,
        PACKAGE_NAME: true
      }
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "import": importPlugin,
      "prettier": prettierPlugin
    },
    rules: {
      // Base ESLint rules
      "no-unused-vars": "off", // Turned off in favor of @typescript-eslint/no-unused-vars
      "no-undef": "error",
      "no-console": "off", // Allow console for this project

      // TypeScript rules
      "@typescript-eslint/explicit-function-return-type": "off", // Too strict for now
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "args": "all",
        "caughtErrors": "all"
      }],
      "@typescript-eslint/no-explicit-any": "off", // Too strict for now

      // Import rules
      "import/order": [
        "error",
        {
          "groups": [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index"
          ],
          "newlines-between": "always",
          "alphabetize": {
            "order": "asc",
            "caseInsensitive": true
          }
        }
      ],
      "import/no-duplicates": "error",
      "import/no-unresolved": "error",

      // Prettier rules
      "prettier/prettier": "error"
    },
    settings: {
      "import/resolver": {
        "typescript": {
          "project": "./tsconfig.json"
        }
      }
    }
  }
]; 