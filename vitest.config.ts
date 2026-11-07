import { defineConfig } from "vitest/config";
export default defineConfig({ test: { testTimeout: 40000, include: ["tests/**/*.test.ts", "apps/server/src/**/*.test.ts", "packages/shared/src/**/*.test.ts"] },
  resolve: { alias: { "@kanpurverse/shared": new URL("./packages/shared/src/index.ts", import.meta.url).pathname } } });
