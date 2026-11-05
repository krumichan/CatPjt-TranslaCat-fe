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
const ANALYSIS_API_BASE_URL = process.env.NEXT_PUBLIC_ACCOUNT_BOOK_ANALYSIS_API_URL;

function requestApiBaseUrl(endpoint: string, method = "GET") {
    // 긴 분석과 그 결과 조회만 별도 원점으로 보내고 다른 업무 API는 유지한다.
    const path = endpoint.split("?")[0];
    const analysisRoot = /^\/account-books\/[1-9]\d*\/spending-analysis$/;
    const analysisRead = /^\/account-books\/[1-9]\d*\/spending-analysis\/(?:snapshot|history(?:\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})?)$/;
    const isAnalysis = (method.toUpperCase() === "POST" && analysisRoot.test(path))
        || (method.toUpperCase() === "GET" && analysisRead.test(path));
    const configured = ANALYSIS_API_BASE_URL?.trim();
    if (!isAnalysis || !configured) return API_BASE_URL;

    // 명시한 공개 설정이 잘못되면 인증 헤더를 다른 경로로 보내지 않는다.
    const base = new URL(configured);
    if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash
        || base.pathname.replace(/\/+$/, "") !== "/api/v1") {
        throw new Error("Invalid account book analysis API base URL");
    }
    return base.href.replace(/\/+$/, "");
}

export const apiClient = async (
    endpoint: string,
    options: RequestInit = {},
    expectedLoginSessionId?: string,
) => {
    const session = await requestSession(options.signal);

    // 세션 조회 중 계정이 바뀌었다면 이전 화면의 요청을 새 사용자로 전송하지 않는다.
    if (expectedLoginSessionId && session?.loginSessionId !== expectedLoginSessionId) {
        throw new DOMException("로그인 세션이 변경되었습니다.", "AbortError");
    }

    if (!session) {
        return unauthorizedResponse();
    }

    if (isTerminalAuthError(session.error)) {
        await notifyRequestUnauthorized(expectedLoginSessionId, options.signal);
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
        await notifyRequestUnauthorized(expectedLoginSessionId, options.signal);
        return unauthorizedResponse();
    }

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    headers.Authorization = `Bearer ${session.accessToken}`;

    const apiUrl = `${requestApiBaseUrl(endpoint, options.method)}${endpoint}`;
    const init = {
        ...options,
        headers,
    };

    const response = await fetch(apiUrl, init);

    if (response.status === 401) {
        await notifyRequestUnauthorized(expectedLoginSessionId, options.signal);
    }

    return response;
};

async function notifyRequestUnauthorized(expectedLoginSessionId?: string, signal?: AbortSignal | null) {
    // 이전 계정의 늦은 인증 실패가 현재 계정을 로그아웃시키지 않게 다시 확인한다.
    if (expectedLoginSessionId) {
        const currentSession = await requestSession(signal);

        if (currentSession?.loginSessionId !== expectedLoginSessionId) {
            throw new DOMException("로그인 세션이 변경되었습니다.", "AbortError");
        }
    }

    notifyAuthUnauthorized();
}

async function requestSession(signal?: AbortSignal | null) {
    if (!signal) {
        return getSession();
    }

    // 인증 조회도 요청 제한 시간에 포함해 세션 응답 지연이 화면을 잠그지 않게 한다.
    signal.throwIfAborted();
    let onAbort: () => void = () => {};
    const aborted = new Promise<never>((_, reject) => {
        onAbort = () => reject(signal.reason ?? new DOMException("요청이 취소되었습니다.", "AbortError"));
        signal.addEventListener("abort", onAbort, { once: true });
    });

    try {
        return await Promise.race([getSession(), aborted]);
    } finally {
        signal.removeEventListener("abort", onAbort);
    }
}

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
