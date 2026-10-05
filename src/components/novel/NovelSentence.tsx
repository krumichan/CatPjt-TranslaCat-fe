"use client";

import { useEffect, useRef, useState } from "react";
import { readerLabels } from "@/features/novel/readerLabels";
import NovelSourceText from "@/components/novel/NovelSourceText";
import type { NovelLanguage, NovelSegment, ReadingMode } from "@/types/novel/reader";

interface Props {
    segment: NovelSegment;
    view: "ja" | "ko" | "parallel";
    locale: string;
    active: boolean;
    read: (mode: ReadingMode, id: string, language?: NovelLanguage) => void;
    repair?: (id: string, clickedAt: number) => void;
    repairing?: boolean;
    repairRequested?: boolean;
}

export default function NovelSentence({ segment, view, locale, active, read, repair, repairing, repairRequested }: Props) {
    const labels = readerLabels(locale);
    const [open, setOpen] = useState(false);
    const [notice, setNotice] = useState("");
    const container = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const translated = segment.status === "SUCCEEDED" && segment.ko !== null;

    useEffect(() => {
        if (!open) return;
        const keydown = (event: KeyboardEvent) => {
            if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
        };
        const outside = (event: PointerEvent) => {
            if (!container.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("keydown", keydown);
        document.addEventListener("pointerdown", outside);
        return () => { document.removeEventListener("keydown", keydown); document.removeEventListener("pointerdown", outside); };
    }, [open]);

    const start = (mode: ReadingMode, language?: NovelLanguage) => {
        read(mode, segment.id, language);
        setOpen(false);
        trigger.current?.focus();
    };
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(view === "ja" || !translated ? segment.plainJa : segment.ko!);
            setNotice(labels.copied);
        } catch { setNotice(labels.copyError); }
    };

    return <div ref={container} id={`novel-segment-${segment.id}`} data-testid="novel-sentence" data-segment-id={segment.id}
        data-active={active} data-status={segment.status} className={`relative rounded-xl p-3 scroll-mt-36 ${active ? "bg-orange-100 dark:bg-orange-950 ring-2 ring-orange-400" : ""}`}>
        <div onClick={() => { if (!window.getSelection()?.toString()) setOpen(true); }} className="whitespace-pre-wrap">
            {(view !== "ko" || !translated) && <p lang="ja"><NovelSourceText segment={segment} /></p>}
            {view !== "ja" && translated && <p lang="ko" className={view === "parallel" ? "text-[0.9em] text-zinc-500" : ""}>{segment.ko}</p>}
            {view !== "ja" && !translated && <span className="block text-xs text-amber-700 dark:text-amber-300">{segment.status === "FAILED" ? labels.failed : labels.sourceOnly}</span>}
        </div>
        {/* 비활성 상태도 같은 버튼을 유지해 복구 중/완료 후 키보드 focus를 잃지 않는다. */}
        {(repairRequested || segment.status === "FAILED") && !segment.errorCode?.includes("REFUSAL") && repair && <button type="button" aria-disabled={repairing || segment.status !== "FAILED"}
            onClick={event => { if (!repairing && segment.status === "FAILED") repair(segment.id, event.timeStamp); }} className="border rounded px-2 py-1 text-sm">{segment.status === "SUCCEEDED" ? labels.repairDone : labels.repair}</button>}
        {segment.plainJa.trim() && <button ref={trigger} type="button" aria-expanded={open} aria-controls={`novel-menu-${segment.id}`} onClick={() => setOpen(value => !value)} className="text-xs rounded px-2 py-1 border mt-2">
            🔊 {labels.menu} {segment.order + 1}
        </button>}
        {open && <div id={`novel-menu-${segment.id}`} role="group" aria-label={labels.menu} className="flex flex-wrap gap-2 border rounded-xl p-3 mt-2 text-sm bg-white dark:bg-zinc-900">
            <button type="button" onClick={() => start("single", "ja")}>{labels.source}: {labels.single}</button>
            <button type="button" disabled={!translated} onClick={() => start("single", "ko")}>{labels.translation}: {labels.single}</button>
            <button type="button" onClick={() => start("from")}>{labels.from}</button>
            <button type="button" onClick={() => void copy()}>{labels.copy}</button>
            <button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }}>{labels.close}</button>
            <span role="status">{notice}</span>
        </div>}
    </div>;
}
