import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["./tests/setup/integration.setup.ts"],
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 60000,
    clearMocks: true,
    restoreMocks: true,
  },
});
