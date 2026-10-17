import type { PageNumber } from "@/types/common";
import type { NovelTargetLanguage } from "@/features/novel/translationLanguage";
export interface CatalogText { rawJa: string; ja: string; ko: string | null; translatedText?: string | null; targetLanguage?: NovelTargetLanguage }

export interface CatalogSelector {
    kind: "RANKING" | "SEARCH";
    period?: string;
    genreId?: string;
    keyword?: string;
    page: number;
    language: "ja" | "ko" | "en";
}
export interface CatalogItem {
    itemId: string;
    identifier: string;
    rank: number | null;
    sourcePosition: number;
    status: "READY" | "FAILED" | "PENDING" | "RUNNING";
    title: CatalogText;
    author: CatalogText;
    synopsis: CatalogText;
    statusText: CatalogText;
    genreText: string;
    isShortStory: boolean;
    arrivalSequence: number;
    errorCode: string | null;
    cached: boolean;
}
export interface CatalogSnapshot {
    snapshotId: string;
    eventSequence: number;
    state: "RUNNING" | "PARTIAL" | "SUCCEEDED" | "CANCELLED";
    total: number;
    ready: number;
    failed: number;
    pageInfo: PageNumber | null;
    selector: CatalogSelector;
    items: CatalogItem[];
    traceId?: string;
}
