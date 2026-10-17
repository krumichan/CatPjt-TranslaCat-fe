"use client";

import { useState } from "react";
import { novelUiText } from "@/features/novel/uiText";

export default function NovelCatalogRetryButton({ status, refused, busy, retry, ja, locale }: { status: string; refused: boolean; busy: boolean; retry: () => void; ja: boolean; locale?: string }) {
    const [requested, setRequested] = useState(false);
    if (status !== "FAILED" && !requested) return null;
    const disabled = busy || refused || status !== "FAILED";
    const labels = novelUiText(locale ?? (ja ? "ja" : "ko"));

    // 실패 카드가 준비돼도 같은 버튼을 남겨 현재 카드와 키보드 focus를 유지한다.
    return <button type="button" aria-disabled={disabled} onClick={() => {
        if (disabled) return;
        setRequested(true);
        retry();
    }} className="border rounded px-3 py-2">{status === "READY" ? labels.ready : labels.retryWork}</button>;
}
