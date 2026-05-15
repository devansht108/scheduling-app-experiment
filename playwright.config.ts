import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",

  fullyParallel: false,

  workers: 1,

  use: {
    baseURL: "http://localhost:3001",
    headless: false,
  },

  webServer: {
    command: "npm run dev",
    port: 3001,
    reuseExistingServer: true,
  },
});
