export const AUTH_UNAUTHORIZED_EVENT = "translacat:auth-unauthorized";
export const AUTH_SIGN_OUT_STARTED_EVENT = "translacat:auth-sign-out-started";

export function notifyAuthSignOutStarted(): void {
    if (typeof window === "undefined") {
        return;
    }

    // 세션 삭제 응답을 기다리는 동안에도 진행 중인 기능은 사용자 로그아웃 의사를 즉시 받는다.
    window.dispatchEvent(new Event(AUTH_SIGN_OUT_STARTED_EVENT));
}

export function notifyAuthUnauthorized(): void {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
}
