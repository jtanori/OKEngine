import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/views-legacy/**",
      "tests/**",
      "scripts/**",
      "docs/**",
    ],
  },
  {
    // Relax strict rules that were not enforced in Next.js 15 next lint
    // to keep build green while preserving core-web-vitals safety
    // OKEng uses custom AppRouterProvider, not Next.js Link, so no-html-link-for-pages is invalid
    // Also allow any, prefer-const, etc for existing codebase
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/prefer-as-const": "warn",
      "prefer-const": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-compiler/react-compiler": "off",
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
];

export default eslintConfig;
