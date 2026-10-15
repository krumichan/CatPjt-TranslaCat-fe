"use client";

import { useEffect, useRef } from "react";
import { readerLabels } from "@/features/novel/readerLabels";
import NovelSourceText from "@/components/novel/NovelSourceText";
import type { NovelSegment } from "@/types/novel/reader";

interface Props {
    segment: NovelSegment;
    view: "ja" | "ko" | "parallel";
    locale: string;
    active: boolean;
    repair?: (id: string, clickedAt: number) => void;
    repairing?: boolean;
    repairRequested?: boolean;
}

export default function NovelSentence({ segment, view, locale, active, repair, repairing, repairRequested }: Props) {
    const labels = readerLabels(locale);
    const translated = segment.status === "SUCCEEDED" && segment.ko !== null;
    const repairButton = useRef<HTMLButtonElement>(null);
    const requestedHere = useRef(false);

    useEffect(() => {
        // 사용자가 누른 복구 버튼이 완료 상태로 바뀔 때, 리렌더가 지운 키보드 focus만 복원한다.
        if (!requestedHere.current || !repairRequested || segment.status !== "SUCCEEDED") return;
        requestedHere.current = false;
        if (document.activeElement === document.body || !document.activeElement?.isConnected) {
            repairButton.current?.focus({ preventScroll: true });
        }
    }, [repairRequested, segment.status]);

    return <div id={`novel-segment-${segment.id}`} data-testid="novel-sentence" data-segment-id={segment.id}
        data-active={active} data-status={segment.status} className={`relative rounded-xl p-3 scroll-mt-36 ${active ? "bg-orange-100 dark:bg-orange-950 ring-2 ring-orange-400" : ""}`}>
        <div className="whitespace-pre-wrap">
            {(view !== "ko" || !translated) && <p lang="ja" className="font-ja"><NovelSourceText segment={segment} /></p>}
            {view !== "ja" && translated && <p lang="ko" className={`font-novel-ko ${view === "parallel" ? "text-zinc-700 dark:text-zinc-300" : ""}`}>{segment.ko}</p>}
            {view !== "ja" && !translated && <span className="block text-xs text-amber-700 dark:text-amber-300">{segment.status === "FAILED" ? labels.failed : labels.sourceOnly}</span>}
        </div>
        {/* 비활성 상태도 같은 버튼을 유지해 복구 중/완료 후 키보드 focus를 잃지 않는다. */}
        {(repairRequested || segment.status === "FAILED") && !segment.errorCode?.includes("REFUSAL") && repair && <button ref={repairButton} type="button" aria-disabled={repairing || segment.status !== "FAILED"}
            onClick={event => {
                if (repairing || segment.status !== "FAILED") return;
                requestedHere.current = true;
                repair(segment.id, event.timeStamp);
            }} className="border rounded px-2 py-1 text-sm">{segment.status === "SUCCEEDED" ? labels.repairDone : labels.repair}</button>}
    </div>;
}
