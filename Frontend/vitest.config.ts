import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Coverage configuration — used by `vitest run --coverage` in CI.
    // Requires the @vitest/coverage-v8 devDependency.
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Output directory matches the path uploaded as an Actions artifact
      reportsDirectory: "./coverage",
      // Exclude non-source files from the coverage report
      exclude: [
        "src/test/**",
        "src/**/*.d.ts",
        "src/vite-env.d.ts",
        "**/*.config.{ts,js}",
        "**/node_modules/**",
      ],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
