import {
    isWebAiAreaCode,
    isWebAiPlanKeyword,
    validateWebAiSchedule,
    type WebAiRecurrence,
    type WebAiSchedule,
} from "./webAiSchedule";

const STORAGE_PREFIX = "translacat:language-learning:web-ai:schedules:v1";
const STORAGE_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function storageKey(owner: string): string {
    return `${STORAGE_PREFIX}:${encodeURIComponent(owner.trim())}`;
}

export function readImportedWebAiDraftIds(owner: string): string[] {
    if (!owner.trim() || typeof window === "undefined") return [];
    try {
        const value: unknown = JSON.parse(window.localStorage.getItem(`${storageKey(owner)}:imported`) ?? "[]");
        return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
    } catch {
        return [];
    }
}

export function markWebAiDraftImported(owner: string, id: string): void {
    if (!owner.trim() || typeof window === "undefined") return;
    try {
        const ids = new Set([...readImportedWebAiDraftIds(owner), id]);
        // 이행 표시만 추가하며 원래 브라우저 초안은 복구용으로 보존한다.
        window.localStorage.setItem(`${storageKey(owner)}:imported`, JSON.stringify([...ids]));
    } catch {
        // 저장소가 차단되어도 서버의 동일 id 생성 검사가 중복 계획을 막는다.
    }
}

function isRecurrence(value: unknown): value is WebAiRecurrence {
    return value === "DAILY" || value === "WEEKLY" || value === "MONTHLY";
}

function hasNoBlockingStorageIssues(schedule: WebAiSchedule): boolean {
    return validateWebAiSchedule(schedule).every((issue) => issue === "LEGACY_AREA_REQUIRES_REVIEW");
}

function parseSchedule(value: unknown): WebAiSchedule | null {
    if (!isRecord(value)) return null;
    if (
        typeof value.id !== "string" || !value.id.trim() ||
        typeof value.name !== "string" ||
        typeof value.originLanguage !== "string" ||
        typeof value.learningLanguage !== "string" ||
        typeof value.feedbackLanguage !== "string" ||
        typeof value.timezone !== "string" ||
        typeof value.time !== "string" ||
        !isRecurrence(value.recurrence) ||
        !Array.isArray(value.weekdays) ||
        !value.weekdays.every((day) => typeof day === "number") ||
        !Array.isArray(value.monthDays) ||
        !value.monthDays.every((day) => typeof day === "number") ||
        typeof value.includeLastDay !== "boolean" ||
        !Array.isArray(value.areas) ||
        typeof value.focus !== "string"
    ) {
        return null;
    }

    const areas = [];
    if (value.keywords !== undefined &&
        (!Array.isArray(value.keywords) || !value.keywords.every(isWebAiPlanKeyword))) {
        return null;
    }
    for (const area of value.areas) {
        if (
            !isRecord(area) ||
            !isWebAiAreaCode(area.code) ||
            typeof area.easy !== "number" ||
            typeof area.standard !== "number" ||
            typeof area.hard !== "number"
        ) {
            return null;
        }
        areas.push({
            code: area.code,
            easy: area.easy,
            standard: area.standard,
            hard: area.hard,
        });
    }

    return {
        id: value.id,
        name: value.name,
        originLanguage: value.originLanguage,
        learningLanguage: value.learningLanguage,
        feedbackLanguage: value.feedbackLanguage,
        timezone: value.timezone,
        time: value.time,
        recurrence: value.recurrence,
        weekdays: [...value.weekdays],
        monthDays: [...value.monthDays],
        includeLastDay: value.includeLastDay,
        areas,
        keywordMode: value.keywordMode === undefined ? "DEFAULT" : value.keywordMode as WebAiSchedule["keywordMode"],
        keywords: Array.isArray(value.keywords)
            ? value.keywords.filter(isWebAiPlanKeyword).map((keyword) => ({ ...keyword }))
            : [],
        focus: value.focus,
    };
}

export function readWebAiSchedules(owner: string): WebAiSchedule[] {
    if (!owner.trim() || typeof window === "undefined") return [];

    try {
        const raw = window.localStorage.getItem(storageKey(owner));
        if (!raw) return [];

        const parsed: unknown = JSON.parse(raw);
        if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.schedules)) {
            return [];
        }

        // 과거 '분야 전체' 문제 수는 임의 유형으로 옮기지 않고 보존해 사용자가 검토하게 한다.
        // 다른 검증 오류가 있는 항목만 제외하고 같은 사용자의 나머지 계획을 복구한다.
        const schedules: WebAiSchedule[] = [];
        const ids = new Set<string>();
        for (const item of parsed.schedules) {
            const schedule = parseSchedule(item);
            if (!schedule || !hasNoBlockingStorageIssues(schedule) || ids.has(schedule.id)) {
                continue;
            }
            ids.add(schedule.id);
            schedules.push(schedule);
        }
        return schedules;
    } catch {
        return [];
    }
}

export function writeWebAiSchedules(owner: string, schedules: WebAiSchedule[]): boolean {
    if (!owner.trim() || typeof window === "undefined" || !Array.isArray(schedules)) {
        return false;
    }

    // 기존 '분야 전체' 계획은 수정 전에도 목록에서 사라지지 않게 함께 저장한다.
    // 이 계획의 프롬프트 생성과 개별 수정 저장은 검증 단계에서 계속 막힌다.
    const ids = new Set<string>();
    for (const schedule of schedules) {
        if (!schedule.id.trim() || ids.has(schedule.id) || !hasNoBlockingStorageIssues(schedule)) {
            return false;
        }
        ids.add(schedule.id);
    }

    try {
        window.localStorage.setItem(
            storageKey(owner),
            JSON.stringify({ version: STORAGE_VERSION, schedules }),
        );
        return true;
    } catch {
        return false;
    }
}
