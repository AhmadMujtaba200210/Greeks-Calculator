// @ts-check
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: ".",
  timeout: 60_000,
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:8085",
    headless: true,
    viewport: { width: 1440, height: 960 },
  },
});
