import { useEffect, useRef, useState } from "react";
import type { ReceiptQueueItem } from "@/types/accountBookReceiptReview";

export function useReceiptAnalysisPanel(receiptQueue: ReceiptQueueItem[]) {
    const [expanded, setExpanded] = useState(true);
    const [regionSourceId, setRegionSourceId] = useState<string | null>(null);
    const autoCollapsed = useRef(false);
    const userExpanded = useRef(false);
    const receiptCount = receiptQueue.reduce((sum, item) => sum + item.receiptCount, 0);
    const progressCount = receiptQueue.filter((item) => ["queued", "analyzing"].includes(item.status)).length;
    const failureCount = receiptQueue.filter((item) => item.status === "failure").length;
    useEffect(
        () => {
            if (!receiptCount || autoCollapsed.current || userExpanded.current
                || typeof window === "undefined" || !window.matchMedia("(max-width: 767px)").matches)
                return;
            const active = document.activeElement;
            if (active instanceof HTMLInputElement || active instanceof HTMLSelectElement || active instanceof HTMLTextAreaElement)
                return;
            autoCollapsed.current = true;
            const timeoutId = window.setTimeout(() => setExpanded(false), 0);
            return () => window.clearTimeout(timeoutId);
        },
        [receiptCount]
    );

    const toggle = () => {
        setExpanded((current) => {
            if (!current)
                userExpanded.current = true;
            return !current;
        });
    };

    const regionSource = receiptQueue.find((item) => item.sourceImageId === regionSourceId) ?? null;
    const closeRegionPicker = () => setRegionSourceId(null);

    return {
        expanded,
        receiptCount,
        progressCount,
        failureCount,
        toggle,
        regionSource,
        setRegionSourceId,
        closeRegionPicker,
    };
}
