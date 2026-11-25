"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { ImageSegment } from "@/features/image-translation/model";
import { usePageProximity, usePageResult, type PageMediaProps } from "@/features/image-translation/useImagePage";

type Bounds = { left: number; top: number; width: number; height: number };
type Placement = Bounds & { segment: ImageSegment; fontSize: number };

// 공유 계약의 보정된 픽셀 경계를 이미지 박스의 상대 좌표로 옮긴다.
function regionBounds(segment: ImageSegment, width: number, height: number): Bounds | undefined {
    if (segment.polygon.length !== 4) return;
    const points = segment.polygon;
    if (points.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > width || y > height)) {
        return;
    }

    const x = points.map((point) => point[0]);
    const y = points.map((point) => point[1]);
    const left = Math.min(...x);
    const top = Math.min(...y);
    const boxWidth = Math.max(...x) - left;
    const boxHeight = Math.max(...y) - top;
    if (boxWidth <= 0 || boxHeight <= 0) return;
    return { left: left / width, top: top / height, width: boxWidth / width, height: boxHeight / height };
}

// 겹치는 OCR 영역에서는 앞선 읽기 순서의 인라인 표시를 우선한다.
function intersects(left: Bounds, right: Bounds): boolean {
    return left.left < right.left + right.width && right.left < left.left + left.width
        && left.top < right.top + right.height && right.top < left.top + left.height;
}

// 좁거나 겹치는 영역에서 읽을 수 없는 글자를 강제로 덮지 않고 아래 대조 목록을 사용한다.
function getPlacements(segments: ImageSegment[], width: number, height: number, renderedWidth: number): Placement[] {
    if (renderedWidth <= 0) return [];
    const placements: Placement[] = [];
    for (const segment of segments) {
        if (!segment.translatedText || segment.needsReview) continue;
        const bounds = regionBounds(segment, width, height);
        if (!bounds || placements.some((existing) => intersects(existing, bounds))) continue;

        // 글자 폭과 줄 수를 보수적으로 산정하고 충분한 여백과 최소 글자 크기를 확보한다.
        const availableWidth = bounds.width * renderedWidth - 12;
        const availableHeight = bounds.height * renderedWidth * height / width - 8;
        const size = Math.min(20, Math.max(14, Math.round(renderedWidth / 45)));
        const lineCount = segment.translatedText.split("\n").reduce((total, line) => {
            const glyphs = Array.from(line).reduce((length, char) => length + (/^[a-z\d ]$/i.test(char) ? 0.9 : 1), 0);
            return total + Math.max(1, Math.ceil(glyphs * size / Math.max(1, availableWidth)));
        }, 0);
        if (availableWidth < 42 || lineCount * size * 1.3 > availableHeight) continue;
        placements.push({ ...bounds, fontSize: size, segment });
    }
    return placements;
}

// 영역 안에 놓을 수 있고 서로 겹치지 않는 대조 목록 번호만 원본에 찍는다.
function getMarkers(
    segments: ImageSegment[],
    placements: Placement[],
    width: number,
    height: number,
    renderedWidth: number,
) {
    const markers: { segment: ImageSegment; bounds: Bounds }[] = [];
    if (renderedWidth <= 0) return markers;

    const placedIds = new Set(placements.map(({ segment }) => segment.segmentId));
    const markerWidth = 20 / renderedWidth;
    const markerHeight = 20 / (renderedWidth * height / width);
    for (const segment of segments) {
        if (placedIds.has(segment.segmentId)) continue;
        const bounds = regionBounds(segment, width, height);
        if (!bounds || bounds.width < markerWidth || bounds.height < markerHeight) continue;

        const marker = { left: bounds.left, top: bounds.top, width: markerWidth, height: markerHeight };
        if (placements.some((placement) => intersects(placement, marker))
            || markers.some(({ bounds }) => intersects(bounds, marker))) continue;
        markers.push({ segment, bounds: marker });
    }
    return markers;
}

// 원본 이미지가 브라우저에서 디코딩되고 레이어가 표시되는 시점을 추적한다.
function useDisplayedAsset(url: string | undefined, attempt: number) {
    const [painted, setPainted] = useState<string>();
    const pending = useRef<AbortController | null>(null);
    useEffect(() => () => pending.current?.abort(), []);

    // 이미지 디코딩 뒤 프레임을 넘겨 HTML 표시 상태의 스냅샷을 남긴다.
    async function recordDisplay(image: HTMLImageElement) {
        if (!url) return;
        const key = url + "/" + attempt;
        pending.current?.abort();
        const controller = new AbortController();
        pending.current = controller;
        try {
            await image.decode();
        } catch {
            return;
        }
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (!controller.signal.aborted && image.isConnected) setPainted(key);
            });
        });
    }

    return { displayed: Boolean(url && painted === url + "/" + attempt), recordDisplay };
}

// 원본의 실제 렌더링 폭에 따라 말풍선의 여유 공간을 다시 계산한다.
function useImageWidth() {
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    useEffect(() => {
        if (!ref.current) return;
        const element = ref.current;
        const measure = () => setWidth(element.clientWidth);
        const frame = requestAnimationFrame(measure);
        const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
        observer?.observe(element);
        return () => {
            observer?.disconnect();
            cancelAnimationFrame(frame);
        };
    }, []);
    return { ref, width };
}

/** 결과 페이지를 고정 순서로 그리고 검토가 필요한 영역은 읽기 목록에서 제공한다. */
export function ImageReaderPage(props: PageMediaProps & { overlay: boolean }) {
    const { messages, page, overlay } = props;
    const { ref, near } = usePageProximity(page.order < 5);
    const [attempt, setAttempt] = useState(0);
    const [brokenAttempt, setBrokenAttempt] = useState<number>();
    const fetchable = ["READY", "NO_TEXT", "FAILED"].includes(page.state);
    const result = usePageResult(props, fetchable && near, attempt);
    const detail = result?.page;
    const originalURL = detail?.originalURL;
    const { displayed, recordDisplay } = useDisplayedAsset(originalURL, attempt);
    const { ref: imageRef, width: renderedWidth } = useImageWidth();

    // 결과를 원본과 독립적으로 표시한다. 원본 조회가 지연되어도 번역 목록은 읽을 수 있다.
    const segments = detail?.segments ?? [];
    const placements = detail?.widthPx && detail.heightPx && overlay
        ? getPlacements(segments, detail.widthPx, detail.heightPx, renderedWidth)
        : [];
    const fallback = detail?.widthPx && detail.heightPx && overlay
        ? getMarkers(segments, placements, detail.widthPx, detail.heightPx, renderedWidth)
        : [];
    const isImageVisible = originalURL && detail?.widthPx && detail.heightPx && brokenAttempt !== attempt;
    const verifiedDisplay = displayed && brokenAttempt !== attempt;
    const hasTranslation = segments.some((segment) => segment.translatedText);
    const display = verifiedDisplay && hasTranslation
        ? (page.state === "READY" ? "translated" : "partial")
        : verifiedDisplay && page.state === "NO_TEXT" ? "original" : undefined;
    const pageNumber = page.order + 1;

    // 서명 주소가 만료되면 한 번 재발급하고, 계속 실패하면 사용자가 직접 다시 조회할 수 있다.
    function handleAssetError() {
        if (attempt === 0) setAttempt(1);
        else setBrokenAttempt(attempt);
    }

    return (
        <article
            ref={ref}
            data-testid={"image-translation-page-" + pageNumber}
            data-page-state={page.state}
            data-display={display}
            aria-label={messages.page + " " + pageNumber}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
        >
            <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <h3 className="text-sm font-semibold">{messages.page} {pageNumber}</h3>
                <span className="text-sm text-slate-600 dark:text-slate-300">{messages.pageStatuses[page.state]}</span>
            </header>

            <div ref={imageRef} className="relative">
                {isImageVisible && originalURL && detail?.widthPx && detail.heightPx ? (
                    <Image
                        key={attempt}
                        src={originalURL}
                        alt={page.fileName || messages.page + " " + pageNumber}
                        width={detail.widthPx}
                        height={detail.heightPx}
                        loading={page.order < 5 ? "eager" : "lazy"}
                        unoptimized
                        referrerPolicy="no-referrer"
                        className="block h-auto w-full"
                        onLoad={(event) => void recordDisplay(event.currentTarget)}
                        onError={handleAssetError}
                    />
                ) : (
                    <div className="flex min-h-28 items-center justify-center bg-slate-50 p-4 text-center text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {!fetchable || !result ? messages.waiting : messages.imageUnavailable}
                    </div>
                )}

                {isImageVisible && displayed && (placements.length > 0 || fallback.length > 0) && (
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                        {placements.map(({ segment, left, top, width, height, fontSize }) => (
                            <span
                                key={segment.segmentId}
                                style={{
                                    left: left * 100 + "%",
                                    top: top * 100 + "%",
                                    width: width * 100 + "%",
                                    height: height * 100 + "%",
                                    fontSize,
                                }}
                                className="absolute grid place-items-center rounded bg-white/95 px-1.5 py-1 text-center font-semibold leading-[1.3] whitespace-pre-line text-slate-950 shadow-sm wrap-anywhere"
                            >
                                {segment.translatedText}
                            </span>
                        ))}
                        {fallback.map(({ segment, bounds }) => (
                            <span
                                key={segment.segmentId}
                                style={{ left: bounds.left * 100 + "%", top: bounds.top * 100 + "%" }}
                                className="absolute flex size-5 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white"
                            >
                                {segment.readingOrder + 1}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {page.failure && (
                <p className="px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
                    {messages.failures[page.failure.code] ?? messages.operationFailed}
                </p>
            )}
            {(result?.failed || brokenAttempt === attempt) && (
                <button type="button" className="mx-4 my-3 rounded-lg border px-3 py-1.5 text-sm" onClick={() => setAttempt((value) => value + 1)}>
                    {messages.retryRead}
                </button>
            )}

            {segments.length > 0 && (
                <ol aria-label={messages.transcript} className="space-y-3 border-t border-slate-200 p-4 text-sm dark:border-slate-700">
                    {segments.map((segment) => (
                        <li
                            key={segment.segmentId}
                            data-testid="image-translation-segment"
                            data-writing-mode={segment.writingMode}
                            className="flex items-start gap-3 wrap-anywhere"
                        >
                            <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold dark:bg-slate-800">
                                {segment.readingOrder + 1}
                            </span>
                            <div className="min-w-0 space-y-1">
                                <p className="font-medium text-slate-600 dark:text-slate-300" dir="auto">
                                    <span className="sr-only">{messages.sourceText} </span>{segment.sourceText}
                                </p>
                                <p className="text-base font-semibold" dir="auto">
                                    <span className="sr-only">{messages.translatedText} </span>
                                    {segment.translatedText ?? messages.noTranslation}
                                </p>
                                {segment.needsReview && <p className="text-xs text-amber-800 dark:text-amber-200">{messages.needsReview}</p>}
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </article>
    );
}
