import fs from "node:fs";
import { encode } from "next-auth/jwt";
import { expect, type APIRequestContext, type BrowserContext } from "@playwright/test";

export const releaseAppUrl = process.env.E2E_BASE_URL ?? "http://localhost:19890";
export const releaseApiUrl = process.env.NOVEL_LIVE_API_URL ?? "http://127.0.0.1:19892/api/v1";

export async function openNovelReleaseSession(context: BrowserContext, request: APIRequestContext, actorId: number) {
    if (!["http://localhost:19890", "http://127.0.0.1:19890"].includes(releaseAppUrl) || releaseApiUrl !== "http://127.0.0.1:19892/api/v1"
        || !Number.isSafeInteger(actorId) || actorId < 900101 || actorId > 900120 || !process.env.NEXTAUTH_SECRET) throw new Error("LOCAL_RELEASE_SESSION_REQUIRED");
    const accounts = JSON.parse(fs.readFileSync(process.env.NOVEL_RECOVERY_ACCOUNTS_FILE ?? "", "utf8")) as { actorId: number; email: string; passwordFile: string }[];
    const account = accounts.find(item => item.actorId === actorId);
    if (!account) throw new Error("LOCAL_ACCOUNT_BINDING_REQUIRED");

    // BE 정상 비밀번호 로그인과 실제 ADMIN 권한을 사용한다. Google OAuth 완료 증거는 아니다.
    const login = await request.post(`${releaseApiUrl}/auth/login`, { data: { email: account.email, password: fs.readFileSync(account.passwordFile, "utf8").trim() } });
    expect(login.ok()).toBe(true);
    const tokens = (await login.json()).body;
    expect(tokens.role).toBe("ADMIN");
    if (!tokens.accessToken || !tokens.refreshToken || tokens.accessTokenExpiresIn < 300) throw new Error("INVALID_LOCAL_BE_SESSION");
    const cookie = await encode({ secret: process.env.NEXTAUTH_SECRET, maxAge: 1800, token: {
        sub: String(actorId), name: `Novel QA ${actorId}`, email: account.email,
        publicId: tokens.publicId, role: tokens.role, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken,
        accessTokenExpires: Date.now() + tokens.accessTokenExpiresIn * 1000,
    } });
    await context.addCookies([{ name: "next-auth.session-token", value: cookie, url: releaseAppUrl, httpOnly: true, sameSite: "Lax", secure: false }]);
    return { Authorization: `Bearer ${tokens.accessToken}` };
}
