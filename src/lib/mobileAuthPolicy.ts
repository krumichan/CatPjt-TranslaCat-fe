export const MOBILE_AUTH_CALLBACK = "translacat-dev://auth/callback";
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const codePattern = /^[A-Za-z0-9_-]{43}$/;
const statePattern = /^[A-Za-z0-9_-]{43,128}$/;

export function validMobileRequestId(value: unknown): value is string {
    return typeof value === "string" && requestIdPattern.test(value);
}

export function mobileSignInPath(locale: string, requestId: string): string {
    if (!validMobileRequestId(requestId)) throw new Error("MOBILE_AUTH_INVALID_REQUEST");
    const supportedLocale = ["ko", "ja", "en", "learning"].includes(locale) ? locale : "ko";
    return `/${supportedLocale}/mobile/sign-in?requestId=${requestId}`;
}

export function buildMobileCallback(requestId: string, authorization: unknown): string | null {
    // BE 응답도 외부 입력으로 검사하고 callback의 주소·query를 서버에서 새로 구성한다.
    if (!validMobileRequestId(requestId) || !authorization || typeof authorization !== "object") return null;
    const value = authorization as Record<string, unknown>;
    if (value.redirectUri !== MOBILE_AUTH_CALLBACK || typeof value.code !== "string" || !codePattern.test(value.code)
        || typeof value.state !== "string" || !statePattern.test(value.state)) return null;
    const callback = new URL(MOBILE_AUTH_CALLBACK);
    callback.searchParams.set("requestId", requestId);
    callback.searchParams.set("code", value.code);
    callback.searchParams.set("state", value.state);
    return callback.toString();
}

export function validMobileCallback(value: unknown, requestId: string): value is string {
    if (typeof value !== "string" || value.length > 512 || !value.startsWith(MOBILE_AUTH_CALLBACK + "?")
        || !validMobileRequestId(requestId)) return false;
    try {
        // 승인 API 응답을 받는 브라우저도 같은 고정 주소와 세 개의 일회 파라미터만 허용한다.
        const callback = new URL(value);
        const allowed = new Set(["requestId", "code", "state"]);
        if (callback.protocol !== "translacat-dev:" || callback.host !== "auth" || callback.pathname !== "/callback"
            || callback.username || callback.password || callback.hash || callback.port
            || [...callback.searchParams.keys()].some(key => !allowed.has(key))
            || [...allowed].some(key => callback.searchParams.getAll(key).length !== 1)
            || callback.searchParams.get("requestId") !== requestId) return false;
        return codePattern.test(callback.searchParams.get("code") ?? "")
            && statePattern.test(callback.searchParams.get("state") ?? "");
    } catch {
        return false;
    }
}
