export const PUBLIC_AUTH_PAGES = ["/login", "/register", "/error"];

export function stripLocalePrefix(pathname: string, supportedLocales: readonly string[]): string {
    const [, firstSegment, ...remainingSegments] = pathname.split("/");

    // 언어 코드와 완전히 같은 경로 구간만 제거해 /korea 같은 서비스 경로를 보존한다.
    return supportedLocales.includes(firstSegment)
        ? `/${remainingSegments.join("/")}`
        : pathname;
}

export function isPublicDocsPath(pathname: string): boolean {
    // 문서 언어는 앱 표시 언어와 별개이며, 공개 범위는 각 /docs 경계 안으로 한정한다.
    return /^\/(ko|ja|en)\/docs(?:\/|$)/.test(pathname);
}

export function validBirthDate(value: string, now = new Date()): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    // 생년월일은 시간대 없는 날짜로 비교하고 실제 존재하는 날짜인지 확인한다.
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    const today = now.toISOString().slice(0, 10);
    return year >= 1 && date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
        && value <= today;
}

export function validPassword(value: string): boolean {
    return value.trim().length > 0 && value.length >= 8 && new TextEncoder().encode(value).length <= 72;
}

export const AUTH_ERROR_MESSAGE_KEYS: Record<string, string> = {
    AUTH_EMAIL_ALREADY_REGISTERED: "AUTH_EMAIL_ALREADY_EXISTS",
    ACCOUNT_ALREADY_EXISTS: "AUTH_EMAIL_ALREADY_EXISTS",
    REGISTRATION_CONFLICT: "AUTH_INVALID_INPUT",
    ACCOUNT_LINK_REQUIRED: "AUTH_ACCOUNT_LINK_REQUIRED",
    AUTH_EMAIL_ACCOUNT_MISMATCH: "AUTH_EMAIL_VERIFICATION_EXPIRED",
    AUTH_EMAIL_SEND_FAILED: "AUTH_MAIL_SEND_FAILED",
    AUTH_EMAIL_CHALLENGE_REPLACED: "AUTH_EMAIL_VERIFICATION_EXPIRED",
    AUTH_EMAIL_RESEND_TOO_SOON: "AUTH_EMAIL_RATE_LIMITED",
    AUTH_EMAIL_HOURLY_LIMIT: "AUTH_EMAIL_RATE_LIMITED",
    AUTH_EMAIL_DAILY_LIMIT: "AUTH_EMAIL_RATE_LIMITED",
    AUTH_EMAIL_CODE_UNAVAILABLE: "AUTH_EMAIL_VERIFICATION_EXPIRED",
    AUTH_EMAIL_CODE_EXPIRED: "AUTH_EMAIL_VERIFICATION_EXPIRED",
    AUTH_EMAIL_CODE_ATTEMPTS_EXCEEDED: "AUTH_EMAIL_VERIFICATION_EXPIRED",
    AUTH_EMAIL_VERIFICATION_INVALID: "AUTH_EMAIL_VERIFICATION_EXPIRED",
    AUTH_EMAIL_UNAVAILABLE: "AUTH_MAIL_UNAVAILABLE",
    GOOGLE_PURPOSE_REQUIRED: "INVALID_REQUEST",
    CURRENT_PASSWORD_INVALID: "AUTH_INVALID_CREDENTIALS",
    GOOGLE_NONCE_MISMATCH: "GOOGLE_FLOW_EXPIRED",
    GOOGLE_EMAIL_MISMATCH: "AUTH_GOOGLE_EMAIL_MISMATCH",
    GOOGLE_ACCOUNT_MISMATCH: "AUTH_GOOGLE_EMAIL_MISMATCH",
    GOOGLE_ALREADY_LINKED: "AUTH_GOOGLE_ALREADY_LINKED",
    PASSWORD_ALREADY_SET: "AUTH_PASSWORD_ALREADY_SET",
    GOOGLE_NOT_LINKED: "GOOGLE_FLOW_FAILED",
    AUTH_PROOF_INVALID_OR_EXPIRED: "REAUTHENTICATION_REQUIRED",
};

export function sameAuthSession(
    expected: { publicId: string; loginSessionId: string },
    session: { loginSessionId?: string; user?: { publicId?: string } } | null,
): boolean {
    return !!session?.loginSessionId
        && expected.publicId === session.user?.publicId
        && expected.loginSessionId === session.loginSessionId;
}

export function isSameOrigin(origin: string | null, expectedUrl: string): boolean {
    if (!origin) return false;
    try {
        return new URL(origin).origin === new URL(expectedUrl).origin;
    } catch {
        return false;
    }
}

export function safeAuthErrorCode(value: unknown): string {
    return typeof value === "string" && /^[A-Z][A-Z0-9_]{1,79}$/.test(value)
        ? value : "AUTH_UNAVAILABLE";
}
