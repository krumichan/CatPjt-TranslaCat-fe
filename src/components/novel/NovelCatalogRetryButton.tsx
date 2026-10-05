"use client";

import { useState } from "react";

export default function NovelCatalogRetryButton({ status, refused, busy, retry, ja }: { status: string; refused: boolean; busy: boolean; retry: () => void; ja: boolean }) {
    const [requested, setRequested] = useState(false);
    if (status !== "FAILED" && !requested) return null;
    const disabled = busy || refused || status !== "FAILED";

    // 실패 카드가 준비돼도 같은 버튼을 남겨 현재 카드와 키보드 focus를 유지한다.
    return <button type="button" aria-disabled={disabled} onClick={() => {
        if (disabled) return;
        setRequested(true);
        retry();
    }} className="border rounded px-3 py-2">{status === "READY" ? (ja ? "準備完了" : "준비 완료") : (ja ? "この作品を再試行" : "이 작품 다시 번역")}</button>;
}
