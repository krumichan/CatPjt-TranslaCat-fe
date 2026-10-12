// Server 실행 - Task Definition 환경 변수 정의가 필요.
// Task Definition 환경 변수는 서버에서 런타임에 불러와 읽을 수 있음.
// Server 실행이기 때문에 웹 브라우저 환경 변수는 읽을 수 없음.
const SERVER_API_URL = process.env.API_URL;

import type { AuthTokens } from "@/types/auth";
import { safeAuthErrorCode } from "@/lib/authPolicy";

export class AuthRequestError extends Error {
    constructor(
        public readonly code: string,
        public readonly status: number,
        public readonly retryAfterSeconds?: number,
    ) {
        super(code);
        this.name = "AuthRequestError";
    }
}

export async function requestServerAuth<T>(
    endpoint: string,
    body?: unknown,
    accessToken?: string,
    method = "POST",
): Promise<{ body: T }> {
    // 인증 요청과 민감한 본문은 로그나 캐시에 남기지 않는다.
    let response: Response;
    try {
        response = await fetch(`${SERVER_API_URL}${endpoint}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
            cache: "no-store",
            signal: AbortSignal.timeout(15000),
        });
    } catch {
        throw new AuthRequestError("AUTH_UNAVAILABLE", 503);
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const retry = data?.body?.retryAfterSeconds ?? Number(response.headers.get("Retry-After"));
        throw new AuthRequestError(
            safeAuthErrorCode(data?.body?.errorCode), response.status,
            Number.isFinite(retry) && retry > 0 ? retry : undefined,
        );
    }
    if (!data || !("body" in data)) {
        throw new AuthRequestError("AUTH_UNAVAILABLE", 502);
    }
    return data as { body: T };
}

export class AuthRefreshError extends Error {
    constructor(
        message: string,
        public readonly status?: number,
    ) {
        super(message);
        this.name = "AuthRefreshError";
    }
}

export const authService = {
    async authenticateWithGoogle(idToken: string) {
        return requestServerAuth<AuthTokens>("/auth/social/google", { idToken });
    },

    async authenticateWithPassword(email: string, password: string) {
        return requestServerAuth<AuthTokens>("/auth/login", { email, password });
    },

    async refreshAccessToken(refreshToken: string) {
        let response: Response;

        try {
            response = await fetch(`${SERVER_API_URL}/auth/token/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
            });
        } catch {
            throw new AuthRefreshError(
                "Token refresh service is temporarily unavailable.",
            );
        }

        if (!response.ok) {
            throw new AuthRefreshError(
                "Token refresh failed.",
                response.status,
            );
        }

        return response.json();
    },
};
