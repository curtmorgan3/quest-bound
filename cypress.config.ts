import path from "node:path";
import { defineConfig } from "cypress";

export default defineConfig({
  viewportWidth: 1200,
  viewportHeight: 800,

  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
      viteConfig: {
        configFile: path.resolve(__dirname, "packages/core-engine/vite.config.ts"),
      },
    },
    specPattern: "cypress/component/**/*.test.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/component.tsx",
  },

  e2e: {
    baseUrl: 'http://localhost:5173',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
