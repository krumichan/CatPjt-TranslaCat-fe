const SESSION_CREATE_STORAGE_KEY = "language-learning:speaking:create";

interface StoredCreateAttempt {
    fingerprint: string;
    idempotencyKey: string;
}

function createIdempotencyKey(prefix: string): string {
    return (
        globalThis.crypto?.randomUUID?.() ??
        `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
}

function getSessionStorage(): Storage | null {
    if (typeof window === "undefined") return null;

    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
}

export function getOrCreateSpeakingSessionIdempotencyKey(
    fingerprint: string,
): string {
    const storage = getSessionStorage();
    const fallback = () => createIdempotencyKey("speaking-session");
    if (!storage) return fallback();

    try {
        const stored = storage.getItem(SESSION_CREATE_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as StoredCreateAttempt;
            if (
                parsed.fingerprint === fingerprint &&
                typeof parsed.idempotencyKey === "string" &&
                parsed.idempotencyKey.length > 0
            ) {
                return parsed.idempotencyKey;
            }
        }

        const idempotencyKey = fallback();
        storage.setItem(
            SESSION_CREATE_STORAGE_KEY,
            JSON.stringify({ fingerprint, idempotencyKey }),
        );
        return idempotencyKey;
    } catch {
        return fallback();
    }
}

export function clearSpeakingSessionIdempotencyKey(): void {
    try {
        getSessionStorage()?.removeItem(SESSION_CREATE_STORAGE_KEY);
    } catch {
        // Session creation already succeeded. Storage cleanup is best effort.
    }
}

function turnStorageKey(sessionId: number, turnIndex: number): string {
    return `language-learning:speaking:${sessionId}:turn:${turnIndex}`;
}

export function getOrCreateSpeakingTurnIdempotencyKey(
    sessionId: number,
    turnIndex: number,
): { storageKey: string; idempotencyKey: string } {
    const storageKey = turnStorageKey(sessionId, turnIndex);
    const storage = getSessionStorage();

    try {
        const existing = storage?.getItem(storageKey);
        if (existing) {
            return { storageKey, idempotencyKey: existing };
        }

        const idempotencyKey = createIdempotencyKey(
            `${sessionId}-${turnIndex}`,
        );
        storage?.setItem(storageKey, idempotencyKey);
        return { storageKey, idempotencyKey };
    } catch {
        return {
            storageKey,
            idempotencyKey: createIdempotencyKey(`${sessionId}-${turnIndex}`),
        };
    }
}

export function clearSpeakingTurnIdempotencyKey(storageKey: string): void {
    try {
        getSessionStorage()?.removeItem(storageKey);
    } catch {
        // Turn processing succeeded. Storage cleanup is best effort.
    }
}
