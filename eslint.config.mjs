import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-stale-*/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Marketing/legal pages use standard prose — unescaped entities are intentional
      "react/no-unescaped-entities": "off",
      // Route handlers and API proxies use unknown/any shapes from external APIs
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
