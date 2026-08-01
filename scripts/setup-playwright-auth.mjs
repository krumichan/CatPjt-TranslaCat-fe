import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

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

const baseURL = (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const users = [
    {
        key: "A",
        publicId: process.env.E2E_USER_A_PUBLIC_ID ?? "TC-H6VR-9KQD",
        statePath: "playwright/.auth/user-a.json",
        chromeProfilePath: "playwright/.chrome-auth/user-a",
    },
    {
        key: "B",
        publicId: process.env.E2E_USER_B_PUBLIC_ID ?? "TC-PFSN-CLNA",
        statePath: "playwright/.auth/user-b.json",
        chromeProfilePath: "playwright/.chrome-auth/user-b",
    },
    {
        key: "C",
        publicId: process.env.E2E_USER_C_PUBLIC_ID ?? "TC-3567-W4EZ",
        statePath: "playwright/.auth/user-c.json",
        chromeProfilePath: "playwright/.chrome-auth/user-c",
    },
];

function findChromeExecutable() {
    const configuredPath = process.env.E2E_CHROME_PATH;
    if (configuredPath) {
        const resolved = path.resolve(configuredPath);
        if (fs.existsSync(resolved)) return resolved;
        throw new Error(`E2E_CHROME_PATH에 지정한 Chrome을 찾을 수 없습니다: ${resolved}`);
    }

    const candidates =
        process.platform === "win32"
            ? [
                  path.join(
                      process.env.PROGRAMFILES ?? "C:\\Program Files",
                      "Google/Chrome/Application/chrome.exe",
                  ),
                  path.join(
                      process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)",
                      "Google/Chrome/Application/chrome.exe",
                  ),
                  path.join(
                      process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData/Local"),
                      "Google/Chrome/Application/chrome.exe",
                  ),
              ]
            : process.platform === "darwin"
              ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
              : [
                    "/usr/bin/google-chrome",
                    "/usr/bin/google-chrome-stable",
                    "/opt/google/chrome/chrome",
                ];

    const found = candidates.find((candidate) => fs.existsSync(candidate));
    if (found) return found;

    throw new Error(
        "Google Chrome 실행 파일을 찾지 못했습니다. .env.e2e.local에 E2E_CHROME_PATH를 지정해주세요.",
    );
}

async function getFreePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            if (!address || typeof address === "string") {
                server.close();
                reject(new Error("Chrome 원격 디버깅 포트를 확보하지 못했습니다."));
                return;
            }

            const { port } = address;
            server.close((error) => {
                if (error) reject(error);
                else resolve(port);
            });
        });
    });
}

async function waitForCdpEndpoint(port) {
    const endpointURL = `http://127.0.0.1:${port}/json/version`;
    const deadline = Date.now() + 30_000;

    while (Date.now() < deadline) {
        try {
            const response = await fetch(endpointURL);
            if (response.ok) {
                const payload = await response.json();
                if (payload.webSocketDebuggerUrl) {
                    return payload.webSocketDebuggerUrl;
                }
            }
        } catch {
            // Chrome가 원격 디버깅 서버를 여는 동안 재시도한다.
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(`Chrome 원격 디버깅 연결 대기 시간이 초과되었습니다: ${endpointURL}`);
}

async function readSession(page) {
    const response = await page.request.get(new URL("/api/auth/session", baseURL).toString());
    if (!response.ok()) return null;

    const session = await response.json();
    const accessToken = session.accessToken ?? session.user?.accessToken;
    const publicId = session.publicId ?? session.user?.publicId;

    return accessToken && publicId ? { accessToken, publicId } : null;
}

async function findApplicationPage(context) {
    const expectedOrigin = new URL(baseURL).origin;
    const existing = context.pages().find((page) => {
        try {
            return new URL(page.url()).origin === expectedOrigin;
        } catch {
            return false;
        }
    });

    if (existing) return existing;

    const page = await context.newPage();
    await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });
    return page;
}

async function verifyExpectedSession(context, expectedPublicId) {
    const page = await findApplicationPage(context);
    const session = await readSession(page).catch(() => null);

    if (session?.publicId === expectedPublicId) {
        return session;
    }

    if (session?.publicId) {
        throw new Error(
            `현재 로그인 publicId는 ${session.publicId}입니다. 기대값 ${expectedPublicId} 계정으로 다시 실행해주세요.`,
        );
    }

    throw new Error(
        "TranslaCat 로그인 세션을 확인하지 못했습니다. 로그인 완료 후 앱 화면까지 돌아왔는지 확인해주세요.",
    );
}

async function saveUserAuth(user, chromeExecutable, prompt) {
    const port = await getFreePort();
    const profilePath = path.resolve(user.chromeProfilePath);
    fs.mkdirSync(profilePath, { recursive: true });

    const chromeArgs = [
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${profilePath}`,
        "--no-first-run",
        "--no-default-browser-check",
        `${baseURL}/login`,
    ];

    console.log("\n============================================================");
    console.log(`E2E User ${user.key} 로그인`);
    console.log(`기대 publicId: ${user.publicId}`);
    console.log("일반 Google Chrome 창을 열었습니다.");
    console.log("해당 Google 계정으로 직접 로그인한 뒤 TranslaCat 화면까지 돌아와주세요.");
    console.log("Google 로그인 중에는 Playwright가 브라우저를 제어하지 않습니다.");
    console.log("============================================================\n");

    const chromeProcess = spawn(chromeExecutable, chromeArgs, {
        detached: false,
        stdio: "ignore",
        windowsHide: false,
    });

    chromeProcess.once("error", (error) => {
        console.error("Chrome 실행 실패:", error);
    });

    let browser;
    try {
        const cdpEndpoint = await waitForCdpEndpoint(port);

        await prompt.question(
            `브라우저에서 ${user.publicId} 계정 로그인을 완료하고 TranslaCat 화면이 열린 뒤 Enter를 눌러주세요. `,
        );

        // Google 로그인 과정에는 연결하지 않고, 사용자가 앱으로 돌아온 뒤에만
        // CDP로 접속하여 TranslaCat 세션을 storageState로 저장한다.
        browser = await chromium.connectOverCDP(cdpEndpoint);
        const context = browser.contexts()[0];

        if (!context) {
            throw new Error("Chrome BrowserContext를 찾지 못했습니다.");
        }

        await verifyExpectedSession(context, user.publicId);

        fs.mkdirSync(path.dirname(user.statePath), { recursive: true });
        await context.storageState({ path: user.statePath });
        console.log(`저장 완료: ${user.statePath}`);
    } finally {
        if (browser) {
            await browser.close().catch(() => undefined);
        }

        if (chromeProcess.exitCode === null) {
            chromeProcess.kill();
        }
    }
}

const chromeExecutable = findChromeExecutable();
const prompt = readline.createInterface({ input, output });

try {
    for (const user of users) {
        await saveUserAuth(user, chromeExecutable, prompt);
    }
} finally {
    prompt.close();
}

console.log("\nA/B/C 인증 상태 저장이 완료되었습니다.");
