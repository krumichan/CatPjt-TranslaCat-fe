import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ]
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Test and live launchers use isolated Next build directories.
    ".next-*/**",
    // Fumadocs가 source.config.ts에서 생성하는 문서 인덱스는 직접 작성한 소스가 아니다.
    ".source/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Playwright result
    "playwright/.chrome-auth/**",
    "playwright/.auth/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
