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
  {
    // ── DEPENDENCY GUARD ────────────────────────────────────────────────────
    // Layering:  geometry ← motion ← components ← pages  (arrows = "depended on by").
    // The geometry engine is the base layer; it must NEVER import upward/outward.
    // Geometry files legitimately import only `react` and same-dir `./…`, so any
    // parent-relative (`../`) or alias (`@/`) import is, by definition, a layer
    // violation. See docs/02_Company/Design/DEPENDENCY_LAYERS.md.
    files: ["app/components/geometry/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*", "../**"],
              message:
                "Geometry layer violation: no imports outside app/components/geometry. Geometry is the base layer (geometry ← motion ← components ← pages) — import only `./` and `react`.",
            },
            {
              group: ["@/*", "@/**"],
              message:
                "Geometry layer violation: no alias imports. Geometry depends on nothing above it.",
            },
            {
              group: ["framer-motion", "motion", "motion/*"],
              message:
                "Geometry layer violation: motion is a HIGHER layer. Geometry is animation-independent (EVL / DLS §5).",
            },
          ],
        },
      ],
    },
  },
  {
    // ── CONTRACTS PURITY GUARD ──────────────────────────────────────────────
    // The inter-layer contracts are pure TypeScript: no React, no Framer Motion,
    // no CSS, no rendering. They may import only Token API v1 + geometry types
    // (type-only, downward). See docs/02_Company/Design/PHASE3_CONTRACTS.md.
    files: ["lib/contracts/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          // Exact package names (so local `./motion`, `./state` are unaffected).
          paths: [
            { name: "react", message: "Contracts are pure TypeScript — no React." },
            { name: "react-dom", message: "Contracts are pure TypeScript — no React." },
            { name: "framer-motion", message: "Contracts describe motion; no motion runtime." },
            { name: "motion", message: "Contracts describe motion; no motion runtime." },
          ],
          patterns: [
            { group: ["react/*", "react-dom/*", "motion/*"], message: "Contracts are pure TypeScript — no React / motion runtime." },
            { group: ["*.css", "**/*.css"], message: "Contracts contain no CSS." },
          ],
        },
      ],
    },
  },
  {
    // ── MOTION LAYER GUARD ──────────────────────────────────────────────────
    // Motion may depend DOWN on geometry + Token API + Contracts. It must not
    // import UP into product components or pages, and uses the native Web
    // Animations API (not Framer). See docs/02_Company/Design/DEPENDENCY_LAYERS.md.
    files: ["lib/motion/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "framer-motion", message: "Motion Engine uses the native Web Animations API, not Framer." }],
          patterns: [
            {
              group: [
                "@/app/components/site/*", "@/app/components/theme/*", "@/app/components/ui/*",
                "**/app/components/site/*", "**/app/components/theme/*", "**/app/components/ui/*",
                "@/app/**/page", "@/app/dashboard/**",
              ],
              message: "Motion layer violation: motion must not import UP (motion ← components ← pages).",
            },
          ],
        },
      ],
    },
  },
  {
    // ── PRODUCT COMPONENTS GUARD ────────────────────────────────────────────
    // Product components compose the foundation (geometry + motion + contracts +
    // tokens). They must not import UP into pages/routes. See DEPENDENCY_LAYERS.md.
    files: ["app/components/product/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/(marketing)/**", "@/app/dashboard/**", "@/app/**/page", "@/app/**/layout"],
              message: "Product components must not import UP into pages/routes (components ← pages).",
            },
          ],
        },
      ],
    },
  },
  {
    // ── MOCK RUNTIME PURITY GUARD ───────────────────────────────────────────
    // Fixtures are pure data: contracts only. No React, no components, no motion.
    files: ["lib/mock/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "Mock Runtime is pure data — no React." },
            { name: "framer-motion", message: "Mock Runtime is pure data — no motion runtime." },
          ],
          patterns: [
            { group: ["@/app/components/**", "**/app/components/product/**"], message: "Mock Runtime must not import components — it feeds them." },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
