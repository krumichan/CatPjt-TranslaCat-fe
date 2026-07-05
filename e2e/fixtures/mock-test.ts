import { expect, test as base } from "@playwright/test";
import { encode } from "next-auth/jwt";
import fs from "node:fs";
import path from "node:path";

import { TEST_USERS } from "../support/test-users";

type MockAuthFixtures = {
    mockAuthCookie: void;
};

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
            .replace(/^['"]|['"]$/g, "");

        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

loadEnvFile(path.resolve(".env.e2e.local"));
loadEnvFile(path.resolve(".env.local"));
loadEnvFile(path.resolve(".env"));

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

if (!nextAuthSecret) {
    throw new Error(
        "NEXTAUTH_SECRET가 필요합니다. .env.local 또는 .env.e2e.local에 설정해 주세요.",
    );
}

/**
 * Mock E2E에서도 NextAuth middleware(withAuth)를 실제로 통과해야 한다.
 * /api/auth/session route mock만으로는 middleware 인증을 통과할 수 없으므로,
 * 테스트 context에 정상 서명된 NextAuth JWT cookie를 먼저 주입한다.
 */
export const test = base.extend<MockAuthFixtures>({
    mockAuthCookie: [
        async ({ context }, use) => {
            const now = Math.floor(Date.now() / 1000);
            const maxAge = 60 * 60;
            const user = TEST_USERS.A;

            const token = await encode({
                secret: nextAuthSecret,
                maxAge,
                token: {
                    name: user.nickname,
                    email: user.email,
                    picture: null,
                    sub: String(user.userId),
                    accessToken: `mock-access-token-${user.key}`,
                    refreshToken: `mock-refresh-token-${user.key}`,
                    accessTokenExpires: Date.now() + maxAge * 1000,
                    role: "USER",
                    publicId: user.publicId,
                    iat: now,
                    exp: now + maxAge,
                    jti: `translacat-e2e-${user.key}-${now}`,
                },
            });

            const url = new URL(baseURL);
            const cookieName =
                url.protocol === "https:"
                    ? "__Secure-next-auth.session-token"
                    : "next-auth.session-token";

            await context.addCookies([
                {
                    name: cookieName,
                    value: token,
                    url: baseURL,
                    httpOnly: true,
                    secure: url.protocol === "https:",
                    sameSite: "Lax",
                    expires: now + maxAge,
                },
            ]);

            await use();
        },
        { auto: true },
    ],
});

export { expect };
