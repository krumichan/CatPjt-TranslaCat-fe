"use client";

import { useState, useSyncExternalStore } from "react";
import { parseFontSize } from "@/features/novel/readerModel";

const readFont = () => {
    try { return parseFontSize(localStorage.getItem("reader_font_size")); } catch { return 18; }
};
const subscribe = (listener: () => void) => {
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
};

export function useReaderFontSize() {
    // SSR은 기본값으로 렌더링하고 hydration 뒤 브라우저 저장소를 구독한다.
    const stored = useSyncExternalStore(subscribe, readFont, () => 18);
    const [sessionValue, setSessionValue] = useState<number | null>(null);
    const fontSize = sessionValue ?? stored;
    const changeFont = (update: (previous: number) => number) => {
        const next = parseFontSize(String(update(fontSize)));
        try { localStorage.setItem("reader_font_size", String(next)); } catch { /* 저장소 제한 시 현재 세션 값 유지 */ }
        setSessionValue(next);
    };
    return { fontSize, changeFont };
}
