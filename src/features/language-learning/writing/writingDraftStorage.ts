import type { DailyWritingType } from "@/types/language-learning/common";

const STORAGE_PREFIX = "translacat:language-learning:writing:draft:v1";
const STORAGE_VERSION = 1;

export interface WritingDraftStorageState {
    version: 1;
    dailySetId: number;
    learningDate: string;
    writingType: DailyWritingType;
    drafts: Record<number, string>;
    bulkEvaluationRequested: boolean;
    updatedAt: string;
}

function buildStorageKey(publicId: string, dailySetId: number): string {
    return `${STORAGE_PREFIX}:${encodeURIComponent(publicId)}:${dailySetId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDrafts(value: unknown): Record<number, string> {
    if (!isRecord(value)) return {};

    const result: Record<number, string> = {};
    for (const [key, draft] of Object.entries(value)) {
        const itemId = Number(key);
        if (!Number.isSafeInteger(itemId) || itemId <= 0 || typeof draft !== "string") {
            continue;
        }
        result[itemId] = draft;
    }
    return result;
}

export function loadWritingDraftState(
    publicId: string,
    dailySetId: number,
): WritingDraftStorageState | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = window.localStorage.getItem(
            buildStorageKey(publicId, dailySetId),
        );
        if (!raw) return null;

        const parsed: unknown = JSON.parse(raw);
        if (!isRecord(parsed)) return null;
        if (parsed.version !== STORAGE_VERSION) return null;
        if (parsed.dailySetId !== dailySetId) return null;
        if (typeof parsed.learningDate !== "string") return null;
        if (
            parsed.writingType !== "TRANSLATION" &&
            parsed.writingType !== "GUIDED" &&
            parsed.writingType !== "FREE"
        ) {
            return null;
        }

        return {
            version: STORAGE_VERSION,
            dailySetId,
            learningDate: parsed.learningDate,
            writingType: parsed.writingType,
            drafts: parseDrafts(parsed.drafts),
            bulkEvaluationRequested:
                parsed.bulkEvaluationRequested === true,
            updatedAt:
                typeof parsed.updatedAt === "string"
                    ? parsed.updatedAt
                    : new Date(0).toISOString(),
        };
    } catch (error) {
        console.warn("Failed to restore Daily Writing drafts.", error);
        return null;
    }
}

export function saveWritingDraftState(
    publicId: string,
    state: Omit<WritingDraftStorageState, "version" | "updatedAt">,
): void {
    if (typeof window === "undefined") return;

    try {
        const value: WritingDraftStorageState = {
            version: STORAGE_VERSION,
            ...state,
            updatedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(
            buildStorageKey(publicId, state.dailySetId),
            JSON.stringify(value),
        );
    } catch (error) {
        console.warn("Failed to persist Daily Writing drafts.", error);
    }
}

export function clearWritingDraftState(
    publicId: string,
    dailySetId: number,
): void {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.removeItem(buildStorageKey(publicId, dailySetId));
    } catch (error) {
        console.warn("Failed to clear Daily Writing drafts.", error);
    }
}
