import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(".env.e2e.local");
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const index = trimmed.indexOf("=");
        if (index < 1) continue;

        const key = trimmed.slice(0, index).trim();
        const value = trimmed
            .slice(index + 1)
            .trim()
            .replace(/^['"]|['"]$/g, "");

        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

function resolvePlaywrightCli() {
    const candidates = [
        path.resolve("node_modules", "@playwright", "test", "cli.js"),
        path.resolve("node_modules", "playwright", "cli.js"),
    ];

    const cliPath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!cliPath) {
        throw new Error(
            "Playwright CLI를 찾을 수 없습니다. npm install 후 다시 실행해 주세요.",
        );
    }

    return cliPath;
}

const cliPath = resolvePlaywrightCli();

// Windows에서 npx.cmd를 shell 없이 spawn하면 EINVAL이 발생할 수 있으므로,
// 현재 Node 실행 파일로 Playwright CLI JS를 직접 실행한다.
const child = spawn(
    process.execPath,
    [cliPath, "test", "--project=integration-chromium"],
    {
        stdio: "inherit",
        env: { ...process.env, E2E_REAL: "1" },
    },
);

child.on("error", (error) => {
    console.error("Integration E2E 실행 실패:", error);
    process.exit(1);
});

child.on("exit", (code, signal) => {
    if (signal) {
        console.error(`Integration E2E가 signal ${signal}로 종료되었습니다.`);
        process.exit(1);
    }

    process.exit(code ?? 1);
});
