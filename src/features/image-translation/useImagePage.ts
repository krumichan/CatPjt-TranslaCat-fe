"use client";

import { useEffect, useRef, useState } from "react";
import { getImagePage } from "@/services/image-translation/imageTranslationService";

import type { ImagePage, ImagePageSummary } from "./model";
import type { ImageTranslationMessages } from "./messages";

export type PageMediaProps = {
    jobId: string;
    page: ImagePageSummary;
    sessionId?: string;
    messages: ImageTranslationMessages;
};

type PageResult = { state: ImagePageSummary["state"]; page?: ImagePage; failed?: boolean };

/** 화면에 가까운 페이지와 회차 초반 페이지만 먼저 불러온다. */
export function usePageProximity(eager: boolean) {
    const ref = useRef<HTMLElement>(null);
    const [near, setNear] = useState(false);

    useEffect(() => {
        if (eager || near || !ref.current) return;
        if (typeof IntersectionObserver === "undefined") {
            const timer = setTimeout(() => setNear(true), 0);
            return () => clearTimeout(timer);
        }
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setNear(true);
                observer.disconnect();
            }
        }, { rootMargin: "75% 0px" });

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [eager, near]);

    return { ref, near: eager || near };
}

/** 조회한 상태가 바뀌면 이전 시도의 번역을 더 이상 새 결과로 표시하지 않는다. */
export function usePageResult({ jobId, page, sessionId }: PageMediaProps, enabled: boolean, attempt: number): PageResult | undefined {
    const [result, setResult] = useState<PageResult>();

    useEffect(() => {
        if (!enabled) return;
        const controller = new AbortController();
        const request = { sessionId, signal: controller.signal };
        void getImagePage(jobId, page.pageId, request)
            .then((detail) => {
                if (!controller.signal.aborted) setResult({ state: page.state, page: detail });
            })
            .catch(() => {
                if (!controller.signal.aborted) setResult({ state: page.state, failed: true });
            });
        return () => controller.abort();
    }, [attempt, enabled, jobId, page.pageId, page.state, sessionId]);

    return enabled && result?.state === page.state ? result : undefined;
}
