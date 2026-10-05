import { expect, request, type APIRequestContext, type APIResponse, type Browser, type BrowserContext, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { encode } from "next-auth/jwt";
import type { UserRole } from "../../src/types/next-auth";

interface AccountIdentity {
    key: "A" | "B" | "DAILY";
    userId: number;
    publicId: string;
    name: string;
}

interface LoginTokens {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;
    publicId: string;
    role: UserRole;
}

export interface LiveConfiguration {
    appUrl: string;
    apiUrl: string;
    accountsFile: string;
    credentialsFile: string;
    chatRoomsFile: string;
    learningResultsFile?: string;
    levelResultsFile?: string;
    dailyAccountFile?: string;
    evidenceDirectory: string;
}

export interface LiveSession {
    account: AccountIdentity;
    context: BrowserContext;
    page: Page;
    api: APIRequestContext;
    failures: string[];
}

export function protectedPath(candidate: string): string {
    // 비밀 fixture와 결과물은 중앙 검증 폴더 안의 실제 경로에만 둔다.
    const root = fs.realpathSync(path.resolve("../.codex-workspace/verification/shared"));
    const resolved = fs.realpathSync(candidate);
    const relative = path.relative(root, resolved);
    if (!path.isAbsolute(candidate) || relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new Error("Live regression files must stay under the shared verification directory.");
    }
    return resolved;
}

export function readProtectedJson<T>(candidate: string): T {
    try {
        return JSON.parse(fs.readFileSync(protectedPath(candidate), "utf8")) as T;
    } catch {
        throw new Error("Protected live regression fixture could not be read.");
    }
}

export function readLiveConfiguration(): LiveConfiguration {
    if (process.env.E2E_RESET_STATE !== "0" || !process.env.NEXTAUTH_SECRET) {
        throw new Error("Live regression requires E2E_RESET_STATE=0 and the running FE NextAuth secret.");
    }
    const configuration = readProtectedJson<LiveConfiguration>(process.env.LIVE_REGRESSION_CONFIG_FILE ?? "");
    for (const candidate of [configuration.appUrl, configuration.apiUrl]) {
        const url = new URL(candidate);
        if (url.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(url.hostname)
            || url.username || url.password || url.search || url.hash) {
            throw new Error("Live regression only accepts loopback HTTP URLs.");
        }
    }
    configuration.evidenceDirectory = protectedPath(configuration.evidenceDirectory);
    return configuration;
}

export async function responseBody<T>(response: APIResponse, operation: string): Promise<T> {
    if (!response.ok()) throw new Error(`${operation} failed with HTTP ${response.status()}.`);
    return ((await response.json()) as { body: T }).body;
}

export async function openLiveSession(browser: Browser, configuration: LiveConfiguration, key: "A" | "B" | "DAILY"): Promise<LiveSession> {
    // 실제 BE 비밀번호 로그인을 수행하고 기존 계정의 식별자와 토큰 발급 결과를 대조한다.
    let account: AccountIdentity | undefined;
    let credential: { email: string; password: string } | undefined;
    if (key === "DAILY") {
        // 기존 baseline 계정의 Daily 결과와 새 실모델 Level Test 계정의 결과를 섞지 않는다.
        const daily = readProtectedJson<{ userId: number; publicId: string; username: string; email: string; password: string }>(configuration.dailyAccountFile ?? "");
        account = { key, userId: daily.userId, publicId: daily.publicId, name: daily.username };
        credential = daily;
    } else {
        account = readProtectedJson<{ accounts: AccountIdentity[] }>(configuration.accountsFile)
            .accounts.find((entry) => entry.key === key);
        credential = readProtectedJson<{ credentials: { key: string; email: string; password: string }[] }>(configuration.credentialsFile)
            .credentials.find((entry) => entry.key === key);
    }
    if (!account || !credential || !Number.isSafeInteger(account.userId)) {
        throw new Error("Two existing isolated local accounts are required.");
    }
    const loginApi = await request.newContext({ baseURL: `${configuration.apiUrl.replace(/\/+$/, "")}/` });
    let tokens: LoginTokens;
    try {
        tokens = await responseBody<LoginTokens>(await loginApi.post("auth/login", {
            data: { email: credential.email, password: credential.password },
        }), "Existing test account login");
    } finally {
        await loginApi.dispose();
    }
    if (!tokens.accessToken || !tokens.refreshToken || tokens.accessTokenExpiresIn < 300) {
        throw new Error("BE returned an incomplete or short-lived test session.");
    }
    expect(tokens.publicId).toBe(account.publicId);
    expect(tokens.role).toBe("USER");

    // Google OAuth 자체는 별도 검증한다. FE 세션 포장만 만들고 업무 HTTP/STOMP는 그대로 통과한다.
    const cookie = await encode({
        secret: process.env.NEXTAUTH_SECRET!,
        maxAge: 30 * 60,
        token: {
            sub: String(account.userId), name: account.name, email: credential.email,
            publicId: tokens.publicId, role: tokens.role,
            accessToken: tokens.accessToken, refreshToken: tokens.refreshToken,
            accessTokenExpires: Date.now() + tokens.accessTokenExpiresIn * 1000,
        },
    });
    const context = await browser.newContext({ baseURL: configuration.appUrl, locale: "ko-KR" });
    const api = await request.newContext({
        baseURL: `${configuration.apiUrl.replace(/\/+$/, "")}/`,
        extraHTTPHeaders: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    try {
        await context.addCookies([{
            name: "next-auth.session-token", value: cookie, url: configuration.appUrl,
            httpOnly: true, sameSite: "Lax", secure: false,
            expires: Math.floor(Date.now() / 1000) + 30 * 60,
        }]);
        const profile = await responseBody<{ userId: number; publicId: string }>(await api.get("users/me/profile"), "Profile identity");
        expect(profile.userId).toBe(account.userId);
        expect(profile.publicId).toBe(account.publicId);

        // 실패 진단에는 응답 본문, 인증 헤더, 개인 입력을 남기지 않는다.
        const page = await context.newPage();
        const failures: string[] = [];
        page.on("pageerror", () => failures.push("Uncaught browser exception"));
        page.on("response", (response) => {
            if (response.url().startsWith(configuration.apiUrl) && response.status() >= 400) {
                failures.push(`${response.request().method()} ${new URL(response.url()).pathname} ${response.status()}`);
            }
        });
        return { account, context, page, api, failures };
    } catch (error) {
        await api.dispose();
        await context.close();
        throw error;
    }
}

export async function closeLiveSessions(sessions: LiveSession[]): Promise<void> {
    await Promise.all(sessions.map(async ({ api, context }) => {
        await api.dispose();
        await context.close();
    }));
}

export async function waitForChat(page: Page): Promise<void> {
    await expect(page.getByTestId("chat-websocket-status")).toHaveText("WS: CONNECTED", { timeout: 30_000 });
}

export function writeLiveEvidence(configuration: LiveConfiguration, filename: string, evidence: unknown): void {
    if (!/^[a-z-]+\.json$/.test(filename)) throw new Error("Invalid evidence filename.");
    fs.writeFileSync(path.join(configuration.evidenceDirectory, filename), `${JSON.stringify(evidence, null, 2)}\n`);
}
