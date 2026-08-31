export const AUTH_UNAUTHORIZED_EVENT = "translacat:auth-unauthorized";

export function notifyAuthUnauthorized(): void {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
}
