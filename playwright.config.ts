import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath: string): void {
    if (!fs.existsSync(filePath)) return;

    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const index = trimmed.indexOf("=");
        if (index < 1) continue;

        const key = trimmed.slice(0, index).trim();
        const value = trimmed
            .slice(index + 1)
            .trim()
            .replace(/^[\'\"]|[\'\"]$/g, "");

        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

loadEnvFile(path.resolve(".env.e2e.local"));
loadEnvFile(path.resolve(".env.local"));

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "1";

const parsedBaseURL = new URL(baseURL);
const hostname = parsedBaseURL.hostname;
const port = Number(
    parsedBaseURL.port || (parsedBaseURL.protocol === "https:" ? "443" : "80"),
);

// 실제 App Router 페이지를 readiness probe로 사용하지 않는다.
// proxy.ts matcher에서 이미 제외되는 /images 경로를 사용해 auth redirect를 피한다.
const readinessURL = new URL("/images/e2e-ready.txt", baseURL).toString();

export default defineConfig({
    testDir: "./e2e",
    timeout: 45_000,
    expect: { timeout: 12_000 },
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : Number(process.env.E2E_WORKERS ?? 1),
    reporter: [["html", { open: "never" }], ["list"]],
    use: {
        baseURL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    projects: [
        {
            name: "mock-chromium",
            testIgnore: /integration\//,
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "integration-chromium",
            testMatch: /integration\/.*\.spec\.ts/,
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: skipWebServer
        ? undefined
        : {
              command: `npm run dev -- --webpack --hostname ${hostname} --port ${port}`,
              url: readinessURL,
              reuseExistingServer: !process.env.CI,
              timeout: 120_000,
              stdout: "pipe",
              stderr: "pipe",
          },
});
