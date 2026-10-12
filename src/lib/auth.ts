import { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createHash, randomUUID } from "node:crypto";

import {
    AUTH_SESSION_ERROR,
    isTemporaryAuthError,
    isTerminalAuthError,
} from "@/lib/authError";
import {
    AuthRefreshError,
    AuthRequestError,
    authService,
} from "@/services/authService";

const ACCESS_TOKEN_REFRESH_MARGIN_MS = 30 * 1000;
const REFRESH_RETRY_BASE_MS = 5 * 1000;
const REFRESH_RETRY_MAX_MS = 30 * 1000;

export const authOptions: NextAuthOptions = {
    // OAuth 오류의 요청 본문/토큰 메타데이터 대신 오류 식별자만 기록한다.
    debug: false,
    logger: {
        error(code) { console.error("Authentication error:", code); },
        warn(code) { console.warn("Authentication warning:", code); },
        debug() {},
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            name: "Email",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                // 비밀번호는 BE에서만 검증하고 세션에는 인증 결과만 전달한다.
                if (!credentials?.email || !credentials.password) return null;
                try {
                    const { body } = await authService.authenticateWithPassword(
                        credentials.email.trim(), credentials.password,
                    );
                    return {
                        id: body.publicId,
                        email: credentials.email.trim(),
                        ...body,
                        accessTokenExpires: Date.now() + body.accessTokenExpiresIn * 1000,
                    };
                } catch (error) {
                    throw new Error(error instanceof AuthRequestError ? error.code : "AUTH_UNAVAILABLE");
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ account, user }) {
            if (account?.provider === "credentials") return !!user.accessToken;
            if (account?.provider !== "google" || !account.id_token) return false;

            // 실패한 Google 인증은 새 세션을 만들기 전에 로그인 화면으로 돌린다.
            try {
                const { body } = await authService.authenticateWithGoogle(account.id_token);
                Object.assign(user, body, {
                    accessTokenExpires: Date.now() + body.accessTokenExpiresIn * 1000,
                });
                return true;
            } catch (error) {
                const code = error instanceof AuthRequestError ? error.code : "AUTH_UNAVAILABLE";
                return `/login?authError=${encodeURIComponent(code)}`;
            }
        },
        async jwt({ token, user, account }) {
            if (account && user) {
                // 로그인 수단별 인증은 signIn/authorize에서 끝내고 토큰 저장은 공유한다.
                if (user.accessToken && user.refreshToken && user.publicId) {
                    return {
                        ...token,
                        // 실제 로그인마다 새 식별자를 발급하고 토큰 갱신에서는 유지한다.
                        loginSessionId: randomUUID(),
                        accessToken: user.accessToken,
                        refreshToken: user.refreshToken,
                        accessTokenExpires: user.accessTokenExpires,
                        role: user.role,
                        publicId: user.publicId,
                        error: undefined,
                        refreshRetryAt: undefined,
                        refreshRetryCount: 0,
                    };
                }
                return { ...token, error: AUTH_SESSION_ERROR.AUTHENTICATION };
            }

            // 이전 JWT를 동시에 읽어도 같은 식별자를 부여하고 이후 갱신에서는 유지한다.
            if (!token.loginSessionId) {
                const loginSessionId = token.jti
                    ? `legacy-${createHash("sha256").update(JSON.stringify([token.sub, token.jti])).digest("hex")}`
                    : randomUUID();
                token = { ...token, loginSessionId };
            }

            if (isTerminalAuthError(token.error)) {
                return token;
            }

            const now = Date.now();

            if (
                isTemporaryAuthError(token.error)
                && token.refreshRetryAt
                && now < token.refreshRetryAt
            ) {
                return token;
            }

            const accessTokenExpires = token.accessTokenExpires ?? 0;
            const shouldRefresh = !token.accessToken
                || accessTokenExpires <= 0
                || now > accessTokenExpires - ACCESS_TOKEN_REFRESH_MARGIN_MS;

            if (!shouldRefresh) {
                return token;
            }

            return refreshAccessToken(token);
        },
        async session({ session, token }) {
            session.loginSessionId = token.loginSessionId;
            session.accessToken = token.accessToken;
            session.refreshToken = token.refreshToken;
            session.error = token.error;
            session.refreshRetryAt = token.refreshRetryAt;

            session.user.accessToken = token.accessToken;
            session.user.refreshToken = token.refreshToken;
            session.user.accessTokenExpires = token.accessTokenExpires;
            session.user.role = token.role;
            session.user.publicId = token.publicId;

            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/error",
    },
};

async function refreshAccessToken(token: JWT): Promise<JWT> {
    if (!token.refreshToken) {
        return terminalRefreshFailure(token);
    }

    try {
        const response = await authService.refreshAccessToken(
            token.refreshToken,
        );
        const { body } = response;

        return {
            ...token,
            accessToken: body.accessToken,
            refreshToken: body.refreshToken ?? token.refreshToken,
            accessTokenExpires:
                Date.now() + (body.accessTokenExpiresIn * 1000),
            role: body.role ?? token.role,
            publicId: body.publicId ?? token.publicId,
            error: undefined,
            refreshRetryAt: undefined,
            refreshRetryCount: 0,
        };
    } catch (error) {
        if (isTransientRefreshFailure(error)) {
            const retryCount = (token.refreshRetryCount ?? 0) + 1;
            const retryDelay = Math.min(
                REFRESH_RETRY_BASE_MS * (2 ** Math.min(retryCount - 1, 3)),
                REFRESH_RETRY_MAX_MS,
            );

            console.warn(
                `Token refresh temporarily unavailable. Retrying in ${retryDelay}ms.`,
            );

            return {
                ...token,
                error: AUTH_SESSION_ERROR.REFRESH_TEMPORARILY_UNAVAILABLE,
                refreshRetryAt: Date.now() + retryDelay,
                refreshRetryCount: retryCount,
            };
        }

        console.warn("Token refresh rejected. Reauthentication is required.");
        return terminalRefreshFailure(token);
    }
}

function isTransientRefreshFailure(error: unknown): boolean {
    if (!(error instanceof AuthRefreshError)) {
        return false;
    }

    if (error.status === undefined) {
        return true;
    }

    return error.status === 408
        || error.status === 429
        || error.status >= 500;
}

function terminalRefreshFailure(token: JWT): JWT {
    return {
        ...token,
        accessToken: undefined,
        refreshToken: undefined,
        accessTokenExpires: undefined,
        error: AUTH_SESSION_ERROR.REFRESH_FAILED,
        refreshRetryAt: undefined,
        refreshRetryCount: 0,
    };
}
