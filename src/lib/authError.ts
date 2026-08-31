export const AUTH_SESSION_ERROR = {
    AUTHENTICATION: "AuthError",
    REFRESH_FAILED: "RefreshAccessTokenError",
    REFRESH_TEMPORARILY_UNAVAILABLE: "RefreshAccessTokenTemporarilyUnavailable",
} as const;

export type AuthSessionError =
    (typeof AUTH_SESSION_ERROR)[keyof typeof AUTH_SESSION_ERROR];

export function isTerminalAuthError(
    error?: AuthSessionError,
): boolean {
    return error === AUTH_SESSION_ERROR.AUTHENTICATION
        || error === AUTH_SESSION_ERROR.REFRESH_FAILED;
}

export function isTemporaryAuthError(
    error?: AuthSessionError,
): boolean {
    return error === AUTH_SESSION_ERROR.REFRESH_TEMPORARILY_UNAVAILABLE;
}
