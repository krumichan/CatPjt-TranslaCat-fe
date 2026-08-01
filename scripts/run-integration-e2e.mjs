import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

function loadEnvFile(filePath) {
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

const requiredFiles = [
    "playwright/.auth/user-a.json",
    "playwright/.auth/user-b.json",
    "playwright/.auth/user-c.json",
];

const missingFiles = requiredFiles.filter((filePath) => !fs.existsSync(filePath));
if (missingFiles.length > 0) {
    console.error("실제 결합 E2E용 인증 상태가 없습니다:");
    for (const filePath of missingFiles) {
        console.error(`- ${filePath}`);
    }
    console.error("먼저 npm run e2e:auth 를 실행해주세요.");
    process.exit(1);
}

if (!process.env.E2E_API_BASE_URL) {
    console.error("E2E_API_BASE_URL이 필요합니다. .env.e2e.local을 확인해주세요.");
    process.exit(1);
}

function deriveWebSocketUrl(apiBaseUrl) {
    const url = new URL(apiBaseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = `${url.pathname
        .replace(/\/api\/v1\/?$/, "")
        .replace(/\/+$/, "")}/ws/chat`;
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
}

// E2E_API_BASE_URL은 Playwright APIRequestContext 전용 값이다.
// 실제 브라우저의 FE는 NEXT_PUBLIC_* 값을 사용하므로, 별도 지정이 없으면
// 동일한 BE를 바라보도록 실행 전에 자동 보정한다.
process.env.NEXT_PUBLIC_API_URL ??= process.env.E2E_API_BASE_URL;
process.env.NEXT_PUBLIC_WS_URL ??= deriveWebSocketUrl(
    process.env.E2E_API_BASE_URL,
);

console.log(
    `[integration-e2e] FE: ${process.env.E2E_BASE_URL ?? "http://localhost:3000"}`,
);
console.log(
    `[integration-e2e] API: ${process.env.NEXT_PUBLIC_API_URL}`,
);
console.log(
    `[integration-e2e] WS: ${process.env.NEXT_PUBLIC_WS_URL}`,
);

const require = createRequire(import.meta.url);
const playwrightCli = require.resolve("@playwright/test/cli");
const args = [
    playwrightCli,
    "test",
    "--project=integration-chromium",
    ...process.argv.slice(2),
];

let child;
try {
    child = spawn(process.execPath, args, {
        stdio: "inherit",
        env: {
            ...process.env,
            E2E_REAL: "1",
        },
    });
} catch (error) {
    console.error("Playwright 실행 프로세스를 시작하지 못했습니다.");
    console.error(error);
    process.exit(1);
}

child.on("error", (error) => {
    console.error("Playwright 실행 프로세스에서 오류가 발생했습니다.");
    console.error(error);
    process.exit(1);
});

child.on("exit", (code, signal) => {
    if (signal) {
        console.error(`Playwright가 signal ${signal}로 종료되었습니다.`);
        process.exit(1);
    }
    process.exit(code ?? 1);
});
