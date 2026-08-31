import { getSession } from "next-auth/react";

import {
    isTemporaryAuthError,
    isTerminalAuthError,
} from "@/lib/authError";
import { notifyAuthUnauthorized } from "@/lib/authEvents";

// 웹 브라우저 실행 - CodeBuild 환경 변수 정의가 필요.
// CodeBuild 환경 변수는 Build 단계에서 값이 들어감.
// getSession -> Session 사용으로 웹 브라우저에서 API 송신을 수행함.
// Task Definition 환경 변수는 서버 전용으로 웹 브라우저가 읽을 수 없음.
// 따라서, CodeBuild 환경 변수를 사용해서 Build 단계에 구울 필요가 있음.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const apiClient = async (
    endpoint: string,
    options: RequestInit = {},
) => {
    const session = await getSession();

    if (!session) {
        return unauthorizedResponse();
    }

    if (isTerminalAuthError(session.error)) {
        notifyAuthUnauthorized();
        return unauthorizedResponse();
    }

    if (isTemporaryAuthError(session.error)) {
        const accessTokenExpires = session.user.accessTokenExpires ?? 0;
        const accessTokenExpired = accessTokenExpires <= Date.now();

        if (!session.accessToken || accessTokenExpired) {
            return temporarilyUnavailableResponse(session.refreshRetryAt);
        }
    }

    if (!session.accessToken) {
        notifyAuthUnauthorized();
        return unauthorizedResponse();
    }

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    headers.Authorization = `Bearer ${session.accessToken}`;

    const apiUrl = `${API_BASE_URL}${endpoint}`;
    const init = {
        ...options,
        headers,
    };

    const response = await fetch(apiUrl, init);

    if (response.status === 401) {
        notifyAuthUnauthorized();
    }

    return response;
};

function unauthorizedResponse(): Response {
    return new Response(null, {
        status: 401,
    });
}

function temporarilyUnavailableResponse(
    retryAt?: number,
): Response {
    const retryAfterSeconds = retryAt
        ? Math.max(Math.ceil((retryAt - Date.now()) / 1000), 1)
        : 5;

    return new Response(null, {
        status: 503,
        headers: {
            "Retry-After": String(retryAfterSeconds),
        },
    });
}
