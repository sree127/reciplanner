import { execSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

// E2E tests run against the local Supabase stack (`npm run db:start`), never the hosted project.
const local = JSON.parse(execSync("npx supabase status -o json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
process.env.LOCAL_SUPABASE_URL = local.API_URL;
process.env.LOCAL_SUPABASE_PUBLISHABLE_KEY = local.PUBLISHABLE_KEY;
process.env.LOCAL_MAILPIT_URL = local.MAILPIT_URL ?? local.INBUCKET_URL;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    ...devices["iPhone 13"],
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run build && npm run start -- -p 3000",
      url: "http://localhost:3000/login",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        SUPABASE_URL: local.API_URL,
        SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY,
        // Lets the website-import test fetch its local fixture page (blocked otherwise).
        ALLOW_LOCAL_IMPORT: "1",
        // Keep import deterministic in tests: exercise the structured-data path, not the
        // optional AI rephrasing. (The AI pass is an enhancement, tested by hand with a key.)
        GEMINI_API_KEY: "",
      },
    },
    {
      // Serves tests/fixtures as recipe pages for the website-import test.
      command: "python3 -m http.server 8787 --bind 127.0.0.1 --directory tests/fixtures",
      url: "http://127.0.0.1:8787/soup.html",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
