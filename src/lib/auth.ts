import { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

import {
    AUTH_SESSION_ERROR,
    isTemporaryAuthError,
    isTerminalAuthError,
} from "@/lib/authError";
import {
    AuthRefreshError,
    authService,
} from "@/services/authService";

const ACCESS_TOKEN_REFRESH_MARGIN_MS = 30 * 1000;
const REFRESH_RETRY_BASE_MS = 5 * 1000;
const REFRESH_RETRY_MAX_MS = 30 * 1000;

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ account }) {
            return !!account?.id_token;
        },
        async jwt({ token, user, account }) {
            if (account && user) {
                try {
                    const response = await authService.authenticateWithGoogle(
                        account.id_token!,
                    );
                    const { body } = response;

                    return {
                        ...token,
                        accessToken: body.accessToken,
                        refreshToken: body.refreshToken,
                        accessTokenExpires:
                            Date.now() + (body.accessTokenExpiresIn * 1000),
                        role: body.role,
                        publicId: body.publicId,
                        error: undefined,
                        refreshRetryAt: undefined,
                        refreshRetryCount: 0,
                    };
                } catch (error) {
                    console.error("Spring Boot Auth Error:", error);
                    return {
                        ...token,
                        error: AUTH_SESSION_ERROR.AUTHENTICATION,
                    };
                }
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
