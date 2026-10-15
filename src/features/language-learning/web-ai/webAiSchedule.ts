export const WEB_AI_AREA_GROUPS = [
    {
        domain: "WRITING",
        areas: ["WRITING_TRANSLATION", "WRITING_GUIDED", "WRITING_FREE"],
    },
    {
        domain: "READING",
        areas: ["READING_COMPREHENSION", "READING_STRUCTURE", "READING_CONTEXT_INFERENCE"],
    },
    {
        domain: "SPEAKING",
        areas: ["SPEAKING_READ_ALOUD", "SPEAKING_GUIDED", "SPEAKING_FREE"],
    },
    {
        domain: "LISTENING",
        areas: ["LISTENING_DICTATION", "LISTENING_COMPREHENSION", "LISTENING_SUMMARY"],
    },
] as const;

export type WebAiSelectableAreaCode = (typeof WEB_AI_AREA_GROUPS)[number]["areas"][number];
export type WebAiLegacyAreaCode = (typeof WEB_AI_AREA_GROUPS)[number]["domain"];
export type WebAiAreaCode = WebAiSelectableAreaCode | WebAiLegacyAreaCode;
export type WebAiRecurrence = "DAILY" | "WEEKLY" | "MONTHLY";
export type WebAiKeywordMode = "DEFAULT" | "CUSTOM";

export interface WebAiPlanKeyword {
    key: string;
    text: string;
    canonicalKey: string | null;
}

export interface WebAiLanguageSettings {
    originLanguage: string;
    learningLanguage: string;
    feedbackLanguage: string;
}

export interface WebAiAreaAllocation {
    code: WebAiAreaCode;
    easy: number;
    standard: number;
    hard: number;
}

export interface WebAiSchedule {
    id: string;
    name: string;
    originLanguage: string;
    learningLanguage: string;
    feedbackLanguage: string;
    timezone: string;
    time: string;
    recurrence: WebAiRecurrence;
    weekdays: number[];
    monthDays: number[];
    includeLastDay: boolean;
    areas: WebAiAreaAllocation[];
    keywordMode: WebAiKeywordMode;
    keywords: WebAiPlanKeyword[];
    focus: string;
}

export type WebAiScheduleIssue =
    | "NAME_REQUIRED"
    | "LANGUAGES_REQUIRED"
    | "SAME_LANGUAGE"
    | "TIMEZONE_INVALID"
    | "TIME_INVALID"
    | "WEEKDAY_REQUIRED"
    | "MONTH_DAY_REQUIRED"
    | "AREA_REQUIRED"
    | "LEGACY_AREA_REQUIRES_REVIEW"
    | "COUNT_INVALID"
    | "COUNT_REQUIRED"
    | "KEYWORDS_INVALID";

const SELECTABLE_AREA_CODES = new Set<string>(WEB_AI_AREA_GROUPS.flatMap((group) => group.areas));
const LEGACY_AREA_CODES = new Set<string>(WEB_AI_AREA_GROUPS.map((group) => group.domain));
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function isWebAiAreaCode(value: unknown): value is WebAiAreaCode {
    return typeof value === "string" &&
        (SELECTABLE_AREA_CODES.has(value) || LEGACY_AREA_CODES.has(value));
}

export function isWebAiSelectableAreaCode(value: unknown): value is WebAiSelectableAreaCode {
    return typeof value === "string" && SELECTABLE_AREA_CODES.has(value);
}

export function createWebAiSchedule(defaults: {
    originLanguage: string;
    learningLanguage: string;
    feedbackLanguage?: string;
    timezone: string;
}): WebAiSchedule {
    const id = globalThis.crypto?.randomUUID?.() ??
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

    return {
        id,
        name: "",
        originLanguage: defaults.originLanguage,
        learningLanguage: defaults.learningLanguage,
        feedbackLanguage: defaults.feedbackLanguage ?? defaults.originLanguage,
        timezone: defaults.timezone,
        time: "18:00",
        recurrence: "DAILY",
        weekdays: [],
        monthDays: [],
        includeLastDay: false,
        areas: [],
        keywordMode: "DEFAULT",
        keywords: [],
        focus: "",
    };
}

export function applyWebAiLanguageSettings(
    schedule: WebAiSchedule,
    settings: WebAiLanguageSettings,
): WebAiSchedule {
    // 계획에 남은 이전 언어 대신 현재 유효한 기본 설정을 출제에 사용한다.
    return {
        ...schedule,
        originLanguage: settings.originLanguage,
        learningLanguage: settings.learningLanguage,
        feedbackLanguage: settings.feedbackLanguage,
    };
}

export function isWebAiPlanKeyword(value: unknown): value is WebAiPlanKeyword {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const keyword = value as Record<string, unknown>;
    return typeof keyword.key === "string" && keyword.key.trim().length > 0 &&
        typeof keyword.text === "string" && keyword.text.trim().length > 0 &&
        (keyword.canonicalKey === null || typeof keyword.canonicalKey === "string");
}

export function resolveWebAiKeywords(
    schedule: WebAiSchedule,
    defaults: readonly WebAiPlanKeyword[],
): WebAiPlanKeyword[] {
    const selected = schedule.keywordMode === "CUSTOM" ? schedule.keywords : defaults;
    return selected.map((keyword) => ({ ...keyword }));
}

function isValidTimezone(value: string): boolean {
    if (!value.trim()) return false;
    try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
    } catch {
        return false;
    }
}

function isValidDayList(values: number[], min: number, max: number): boolean {
    return values.every((value) => Number.isInteger(value) && value >= min && value <= max);
}

export function validateWebAiSchedule(schedule: WebAiSchedule): WebAiScheduleIssue[] {
    const issues: WebAiScheduleIssue[] = [];

    // 사용자가 복사할 프롬프트에 들어갈 기본 식별과 언어 정보를 확인한다.
    if (!schedule.name.trim()) issues.push("NAME_REQUIRED");
    if (
        !schedule.originLanguage.trim() ||
        !schedule.learningLanguage.trim() ||
        !schedule.feedbackLanguage.trim()
    ) {
        issues.push("LANGUAGES_REQUIRED");
    } else if (
        schedule.originLanguage.trim().toLowerCase() ===
        schedule.learningLanguage.trim().toLowerCase()
    ) {
        issues.push("SAME_LANGUAGE");
    }

    // 계획별 선택은 기본 키워드와 분리해서 검증한다.
    if (
        (schedule.keywordMode !== "DEFAULT" && schedule.keywordMode !== "CUSTOM") ||
        !Array.isArray(schedule.keywords) ||
        !schedule.keywords.every(isWebAiPlanKeyword) ||
        new Set(schedule.keywords.map((keyword) => keyword.key)).size !== schedule.keywords.length
    ) {
        issues.push("KEYWORDS_INVALID");
    }

    // 시간대와 시각은 복사한 스케줄 설명에서도 모호하지 않아야 한다.
    if (!isValidTimezone(schedule.timezone)) issues.push("TIMEZONE_INVALID");
    if (!TIME_PATTERN.test(schedule.time)) issues.push("TIME_INVALID");

    if (schedule.recurrence === "WEEKLY") {
        if (
            !Array.isArray(schedule.weekdays) ||
            schedule.weekdays.length === 0 ||
            !isValidDayList(schedule.weekdays, 0, 6)
        ) {
            issues.push("WEEKDAY_REQUIRED");
        }
    } else if (schedule.recurrence === "MONTHLY") {
        if (
            !Array.isArray(schedule.monthDays) ||
            !isValidDayList(schedule.monthDays, 1, 31) ||
            (schedule.monthDays.length === 0 && !schedule.includeLastDay)
        ) {
            issues.push("MONTH_DAY_REQUIRED");
        }
    } else if (schedule.recurrence !== "DAILY") {
        issues.push("TIME_INVALID");
    }

    // 기존 상위 분야의 문제 수는 보존하되, 하위 유형으로 직접 재배치할 때까지 출제를 막는다.
    if (
        !Array.isArray(schedule.areas) ||
        schedule.areas.length === 0 ||
        schedule.areas.some((area) => !isWebAiAreaCode(area.code)) ||
        new Set(schedule.areas.map((area) => area.code)).size !== schedule.areas.length
    ) {
        issues.push("AREA_REQUIRED");
        return issues;
    }
    if (schedule.areas.some((area) => !isWebAiSelectableAreaCode(area.code))) {
        issues.push("LEGACY_AREA_REQUIRES_REVIEW");
    }

    let total = 0;
    for (const area of schedule.areas) {
        for (const count of [area.easy, area.standard, area.hard]) {
            if (!Number.isSafeInteger(count) || count < 0) {
                issues.push("COUNT_INVALID");
                return issues;
            }
            total += count;
            if (!Number.isSafeInteger(total)) {
                issues.push("COUNT_INVALID");
                return issues;
            }
        }
    }
    if (total === 0) issues.push("COUNT_REQUIRED");

    return issues;
}
