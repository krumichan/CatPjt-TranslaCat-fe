import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type { WebAiSelectableAreaCode } from "@/features/language-learning/web-ai/webAiSchedule";

export type PracticeArea = WebAiSelectableAreaCode;
export type PracticeLimits = Record<PracticeArea, number>;
export type PracticeQuantity = { easy: number; standard: number; hard: number };
export type PracticePlanInput = {
    name: string;
    studyTime: string;
    enabled: boolean;
    revision?: number;
    areas: Partial<Record<PracticeArea, PracticeQuantity>>;
};
export type PracticePlan = PracticePlanInput & {
    id: string;
    revision: number;
    originLanguage: string;
    learningLanguage: string;
    pauseReason: string | null;
};
export type PreparedPractice = {
    id: number;
    area: PracticeArea;
    learningDate: string;
    resourceId: string | null;
    state: string;
    reason: string | null;
};
export type PracticeWorkspace = {
    timezone: string;
    plans: PracticePlan[];
    limits: PracticeLimits;
    writingLimit: number;
    availableAreas: PracticeArea[];
    jobs: PreparedPractice[];
};

const root = "/language-learning/auto-practice";

/** 自動出題は保存済みデータのみ返す。ブラウザーから生成を起動しない。 */
async function request<T>(path: string, method: string = "GET", body?: unknown): Promise<T> {
    const response = await apiClient(`${root}${path}`, {
        method,
        body: body == null ? undefined : JSON.stringify(body),
    });
    return parseResponseBody<T>(response, "AutomaticPractice");
}

export const autoPracticeService = {
    workspace: () => request<PracticeWorkspace>(""),
    savePlan: (plan: PracticePlanInput, id?: string) => id
        ? request<PracticePlan>(`/plans/${encodeURIComponent(id)}`, "PUT", plan)
        : request<PracticePlan>("/plans", "POST", plan),
    deletePlan: (id: string) => request<null>(`/plans/${encodeURIComponent(id)}`, "DELETE"),
    limits: () => request<{ limits: PracticeLimits }>("/admin/limits"),
    saveLimits: (limits: PracticeLimits) =>
        request<{ limits: PracticeLimits }>("/admin/limits", "PUT", { limits }),
};
