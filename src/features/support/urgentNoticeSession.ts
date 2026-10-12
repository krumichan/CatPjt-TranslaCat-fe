const STORAGE_PREFIX = "translacat:support:urgent:closed:";
const LOCAL_EVENT = "translacat:support:urgent-closed";
const memoryClosed = new Set<string>();

export function urgentNoticeScope(owner: string, loginSessionId: string): string {
    return `${STORAGE_PREFIX}${encodeURIComponent(JSON.stringify([owner, loginSessionId]))}:`;
}

export function closedUrgentNoticeSnapshot(scope: string): string {
    const closed = new Set<string>();

    // 공지마다 별도 키를 사용해 여러 탭이 동시에 다른 공지를 닫아도 기록을 보존한다.
    for (const key of memoryClosed) {
        if (key.startsWith(scope)) {
            closed.add(key.slice(scope.length));
        }
    }

    try {
        for (let index = 0; index < window.localStorage.length; index += 1) {
            const key = window.localStorage.key(index);

            if (key?.startsWith(scope) && window.localStorage.getItem(key) === "1") {
                closed.add(key.slice(scope.length));
            }
        }
    } catch {
        // 저장소 사용이 제한된 브라우저에서는 현재 화면의 닫기 동작을 유지한다.
    }

    return [...closed].sort().join(",");
}

export function closeUrgentNoticeForLogin(scope: string, noticeId: number): void {
    const key = `${scope}${noticeId}`;

    try {
        window.localStorage.setItem(key, "1");
    } catch {
        memoryClosed.add(key);
    }

    // storage 이벤트는 다른 탭에만 전달되므로 현재 탭에도 변경을 알린다.
    window.dispatchEvent(new Event(LOCAL_EVENT));
}

export function subscribeUrgentNoticeClosures(scope: string, listener: () => void): () => void {
    const onStorage = (event: StorageEvent) => {
        if (event.key === null || event.key.startsWith(scope)) {
            listener();
        }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_EVENT, listener);

    return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(LOCAL_EVENT, listener);
    };
}
