export class IdentityError extends Error {
    constructor(public code: string, public retryAfterSeconds = 0) {
        super(code);
        this.name = "IdentityError";
    }
}

export async function identityRequest<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    let response: Response;
    try {
        response = await fetch(path, {
            method: body === undefined ? "GET" : "POST",
            headers: { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
            cache: "no-store",
            signal,
        });
    } catch {
        throw new IdentityError("AUTH_UNAVAILABLE");
    }
    const result = await response.json().catch(() => null);
    if (!response.ok) {
        throw new IdentityError(result?.body?.errorCode ?? "AUTH_UNAVAILABLE", result?.body?.retryAfterSeconds ?? 0);
    }
    return result?.body as T;
}

export function identityErrorCode(error: unknown): string {
    return error instanceof IdentityError ? error.code : "AUTH_UNAVAILABLE";
}
