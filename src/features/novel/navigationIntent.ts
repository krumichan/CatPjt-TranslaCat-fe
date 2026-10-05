interface AnchorIntent {
    button: number;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    defaultPrevented: boolean;
    download: boolean;
    target: string;
    href: string;
    currentHref: string;
}

export function leavesReaderInCurrentTab(intent: AnchorIntent) {
    // 새 탭, 저장, 보조 클릭은 현재 낭독을 떠나는 의사가 아니다.
    if (intent.defaultPrevented || intent.button !== 0 || intent.altKey || intent.ctrlKey || intent.metaKey || intent.shiftKey || intent.download) return false;
    if (intent.target && intent.target.toLowerCase() !== "_self") return false;
    try {
        const next = new URL(intent.href, intent.currentHref);
        const current = new URL(intent.currentHref);
        if (!["http:", "https:"].includes(next.protocol)) return false;
        return next.origin !== current.origin || next.pathname !== current.pathname || next.search !== current.search;
    } catch {
        return false;
    }
}
