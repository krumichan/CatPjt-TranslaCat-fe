import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

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
            .replace(/^['"]|['"]$/g, "");

        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

loadEnvFile(path.resolve(".env.e2e.local"));
loadEnvFile(path.resolve(".env.local"));
loadEnvFile(path.resolve(".env"));

// Google OAuth/NextAuth의 redirect origin과 동일한 host를 사용해야 한다.
// TranslaCat 로컬 OAuth 설정은 localhost 기준이므로 기본값도 localhost로 둔다.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const authDir = path.resolve("playwright/.auth");
const chromeProfileRoot = path.resolve("playwright/.chrome-auth");

const users = [
    {
        key: "A",
        publicId: process.env.E2E_USER_A_PUBLIC_ID ?? "TC-H6VR-9KQD",
        authPath: path.join(authDir, "user-a.json"),
        profilePath: path.join(chromeProfileRoot, "user-a"),
    },
    {
        key: "B",
        publicId: process.env.E2E_USER_B_PUBLIC_ID ?? "TC-PFSN-CLNA",
        authPath: path.join(authDir, "user-b.json"),
        profilePath: path.join(chromeProfileRoot, "user-b"),
    },
    {
        key: "C",
        publicId: process.env.E2E_USER_C_PUBLIC_ID ?? "TC-3567-W4EZ",
        authPath: path.join(authDir, "user-c.json"),
        profilePath: path.join(chromeProfileRoot, "user-c"),
    },
];

function findChromeExecutable() {
    const configured = process.env.E2E_CHROME_PATH;
    if (configured) {
        const resolved = path.resolve(configured);
        if (!fs.existsSync(resolved)) {
            throw new Error(`E2E_CHROME_PATH에 지정한 Chrome을 찾을 수 없습니다: ${resolved}`);
        }
        return resolved;
    }

    const candidates = [];

    if (process.platform === "win32") {
        const localAppData = process.env.LOCALAPPDATA;
        const programFiles = process.env.PROGRAMFILES;
        const programFilesX86 = process.env["PROGRAMFILES(X86)"];

        if (localAppData) {
            candidates.push(
                path.join(localAppData, "Google/Chrome/Application/chrome.exe"),
            );
        }
        if (programFiles) {
            candidates.push(
                path.join(programFiles, "Google/Chrome/Application/chrome.exe"),
            );
        }
        if (programFilesX86) {
            candidates.push(
                path.join(programFilesX86, "Google/Chrome/Application/chrome.exe"),
            );
        }
    } else if (process.platform === "darwin") {
        candidates.push(
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        );
    } else {
        for (const command of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
            try {
                const found = execFileSync("which", [command], {
                    encoding: "utf8",
                    stdio: ["ignore", "pipe", "ignore"],
                }).trim();
                if (found) candidates.push(found);
            } catch {
                // 다음 후보 검사
            }
        }
    }

    const found = candidates.find((candidate) => fs.existsSync(candidate));
    if (!found) {
        throw new Error(
            "Google Chrome 실행 파일을 찾지 못했습니다. .env.e2e.local에 E2E_CHROME_PATH를 설정해 주세요.",
        );
    }

    return found;
}

async function waitForCdp(port, timeoutMs = 30_000) {
    const endpoint = `http://127.0.0.1:${port}/json/version`;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        try {
            const response = await fetch(endpoint);
            if (response.ok) return;
        } catch {
            // Chrome 시작 대기
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
    }

    throw new Error(`Chrome CDP 시작 시간 초과: ${endpoint}`);
}

async function waitForExpectedSession(context, user) {
    const deadline = Date.now() + 10 * 60 * 1000;

    while (Date.now() < deadline) {
        try {
            const response = await context.request.get(`${baseURL}/api/auth/session`);
            if (response.ok()) {
                const session = await response.json();
                const publicId = session?.user?.publicId;

                if (publicId === user.publicId) {
                    return;
                }

                if (publicId) {
                    console.log(
                        `[${user.key}] 현재 로그인 publicId=${publicId}, 기대값=${user.publicId}`,
                    );
                }
            }
        } catch {
            // OAuth redirect/login 진행 중
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`[${user.key}] ${user.publicId} 로그인 확인 시간 초과`);
}

async function captureUserAuth(chromePath, user, index) {
    const port = 9322 + index;
    await mkdir(user.profilePath, { recursive: true });

    console.log(`\n[${user.key}] ${user.publicId} 인증 준비`);
    console.log("일반 Google Chrome 창이 열립니다. 해당 계정으로 로그인해 주세요.");

    const chromeProcess = spawn(
        chromePath,
        [
            `--remote-debugging-port=${port}`,
            `--user-data-dir=${user.profilePath}`,
            "--no-first-run",
            "--no-default-browser-check",
            `${baseURL}/login`,
        ],
        {
            stdio: "ignore",
            windowsHide: false,
        },
    );

    let browser;

    try {
        await waitForCdp(port);
        browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);

        const context = browser.contexts()[0];
        if (!context) {
            throw new Error(`[${user.key}] Chrome browser context를 찾을 수 없습니다.`);
        }

        const pages = context.pages();
        const page = pages[0] ?? (await context.newPage());

        if (!page.url().startsWith(baseURL)) {
            await page.goto(`${baseURL}/login`);
        }

        await waitForExpectedSession(context, user);
        await context.storageState({ path: user.authPath });

        console.log(`[${user.key}] 저장 완료: ${user.authPath}`);
    } finally {
        if (browser) {
            await browser.close().catch(() => undefined);
        }

        if (!chromeProcess.killed) {
            chromeProcess.kill();
        }
    }
}

await mkdir(authDir, { recursive: true });
await mkdir(chromeProfileRoot, { recursive: true });

const chromePath = findChromeExecutable();
console.log(`Chrome: ${chromePath}`);
console.log(`TranslaCat URL: ${baseURL}`);

for (const [index, user] of users.entries()) {
    await captureUserAuth(chromePath, user, index);
}

console.log("\nA/B/C 인증 상태 저장 완료.");
console.log("playwright/.auth/ 와 playwright/.chrome-auth/ 는 Git에 커밋하지 마세요.");
