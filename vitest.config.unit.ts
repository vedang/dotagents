import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "pi-extensions/**/__tests__/**/*.test.ts",
      "dotagents/**/__tests__/**/*.test.ts",
    ],
    exclude: [
      "pi-extensions/**/__tests__/integration/**/*.test.ts",
      "pi-extensions/**/__tests__/llm/**/*.test.ts",
    ],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
