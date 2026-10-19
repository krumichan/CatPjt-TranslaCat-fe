import type { Session } from "next-auth";
import { getSession } from "next-auth/react";

import { AUTH_SESSION_ERROR } from "@/lib/authError";

function record(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function optionalString(value: unknown, nullable = false): boolean {
    return value === undefined || typeof value === "string" || (nullable && value === null);
}

function optionalFiniteNumber(value: unknown): boolean {
    return value === undefined || (typeof value === "number" && Number.isFinite(value));
}

function validSession(value: unknown): value is Session {
    if (!record(value) || typeof value.expires !== "string" || !record(value.user)) return false;
    const user = value.user;

    // Session의 필수 구조와 재연결에서 사용하는 확장 필드를 실제로 검사한다.
    return optionalString(value.accessToken) && optionalString(value.refreshToken)
        && optionalString(value.loginSessionId) && optionalFiniteNumber(value.refreshRetryAt)
        && (value.error === undefined || Object.values(AUTH_SESSION_ERROR).some(error => error === value.error))
        && [user.name, user.email, user.image].every(field => optionalString(field, true))
        && [user.accessToken, user.refreshToken, user.publicId].every(field => optionalString(field))
        && optionalFiniteNumber(user.accessTokenExpires)
        && (user.role === undefined || user.role === "USER" || user.role === "ADMIN");
}

export async function getChatWebSocketSession({ isCurrent, signal }: {
    isCurrent: () => boolean;
    signal: AbortSignal;
}): Promise<Session | null> {
    const current = () => !signal.aborted && isCurrent();
    if (!current()) return null;

    // 매 CONNECT 전에 NextAuth가 기존 웹 세션을 갱신하게 한다. 소켓만의 조회는 다른 탭에 전파하지 않는다.
    const session = await getSession({ broadcast: false });
    if (!current()) return null;
    if (session) return session;

    // NextAuth는 네트워크·5xx 실패도 null로 숨긴다. 성공한 빈 응답과 통신 장애를 한 번 더 구분한다.
    // 기존 토큰으로 연결하지 않으며, 화면 종료·계정 변경과 요청 제한 시간이 재확인도 취소한다.
    const response = await fetch("/api/auth/session", {
        method: "GET", credentials: "same-origin", cache: "no-store", redirect: "error",
        signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
    });
    if (!current()) return null;
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) throw new Error("CHAT_SESSION_LOOKUP_UNAVAILABLE");

    const payload: unknown = await response.json();
    if (!current()) return null;
    if (payload === null || (record(payload) && Object.keys(payload).length === 0)) return null;

    // 파싱·형식 오류도 로그아웃의 증거가 아니므로 잠시 후 다시 조회한다. 원문은 오류에 넣지 않는다.
    if (!validSession(payload)) throw new Error("CHAT_SESSION_LOOKUP_INVALID");
    return payload;
}
