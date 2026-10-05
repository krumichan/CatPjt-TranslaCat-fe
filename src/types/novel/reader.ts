export type NovelLanguage = "ja" | "ko";
export type ReadingMode = "all" | "single" | "from";
export type SegmentStatus = "PENDING" | "SUCCEEDED" | "FAILED";
export type ReaderState = "SOURCE_READY" | "QUEUED" | "RUNNING" | "PARTIAL" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export interface NovelSegment {
    id: string;
    paragraphId: string;
    order: number;
    paragraphIndex: number;
    startOffset: number;
    endOffset: number;
    rawJa: string;
    plainJa: string;
    ko: string | null;
    status: SegmentStatus;
    errorCode: string | null;
    rubyTokens?: { startOffset: number; endOffset: number; text: string; reading: string }[];
}

export interface ReaderSnapshot {
    revision: string;
    segmentationVersion: string;
    title: { rawJa: string; ja: string; ko: string | null };
    pagerInfo: { prevIdentifier: string | null; nextIdentifier: string | null; listIdentifier: string } | null;
    segments: NovelSegment[];
    totalSegments: number;
    completedSegments: number;
    state: ReaderState;
    jobId: string | null;
    eventSequence: number;
    durableComplete: boolean;
    traceId?: string;
    runTraceId?: string;
    audioPolicyVersion?: string;
    policyVersion?: string;
    glossaryVersion?: string;
    transport?: NovelTransportTiming;
    execution?: { executionDeadlineMs?: number; jobElapsedMs?: number; profileIdentity?: string };
    timings?: { sourceFetchIncluded?: boolean };
    initialAttemptState?: ReaderState;
    recovery?: { repairId: string; state: ReaderState; targetIds: string[]; committedIds: string[]; errorCode: string | null; traceId: string } | null;
}

export interface RepairTimings {
    traceId: string;
    runTraceId?: string;
    repairId?: string;
    disposition?: "REQUESTED" | "JOINED" | "REUSED_READY";
    targetIds: string[];
    startedAt: number;
    committedObservedMs?: number;
    repairReadyMs?: number;
    delayed: boolean;
    state: "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
    errorCode?: string;
}

export interface NovelAudioPart {
    revision: string;
    segmentId: string;
    language: NovelLanguage;
    partIndex: number;
    partCount: number;
    blob: Blob;
    cacheHit?: boolean;
    audioPolicyVersion?: string;
    transport?: NovelTransportTiming;
}

export interface NovelTransportTiming {
    traceId?: string;
    requestToHeadersMs: number;
    bodyReadMs: number;
    beDurationMs?: number;
    beAuthDispatchMs?: number;
    upstreamHeadersMs?: number;
    upstreamDurationMs?: number;
    beValidationMs?: number;
}

export interface ReaderTimings {
    firstSource?: number;
    firstTranslation?: number;
    readReady200?: number;
    translations50?: number;
    translations90?: number;
    allTranslations?: number;
    durableComplete?: number;
    durableObserved?: number;
    traceId?: string;
    sourceReadTraceId?: string;
    sourceFetchIncluded?: boolean;
    sourceRequestIncluded?: boolean;
    sourceCached?: boolean;
    origin?: "reader-entry" | "translation-click";
    originDocumentTimeMs?: number;
    documentTimeAtFirstSourceMs?: number;
    progress?: { total: number; completed: number; prefix: number; translatedPrefixChars: number; ratio: number; prefixRatio: number };
    prefixHistory?: { elapsedMs: number; sourceCodePoints: number; ratio: number }[];
    translatedPrefixHistory?: { elapsedMs: number; translatedCodePoints: number }[];
    renderSpans?: { eventSequence: number; elapsedMs: number; applyToPaintMs: number }[];
}
