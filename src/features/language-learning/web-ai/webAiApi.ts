import type { WebAiSchedule } from "./webAiSchedule";
import type { WebAiConnection, WebAiPlanRequest, WebAiResultImport } from "@/types/language-learning/webAi";

export function toWebAiPlanRequest(schedule: WebAiSchedule, enabled = true, revision?: number): WebAiPlanRequest {
    // 언어는 서버 공통 설정에서 결정한다. 브라우저에 남은 과거 언어를 요청에 넣지 않는다.
    const { name, timezone, time, recurrence, weekdays, monthDays, includeLastDay, areas, keywordMode, keywords, focus } = schedule;
    return { id: schedule.id, name, timezone, time, recurrence, weekdays, monthDays, includeLastDay, areas, keywordMode, keywords, focus, enabled, ...(revision === undefined ? {} : { revision }) };
}

export function resolveWebAiConnection(connection: WebAiConnection, apiBaseUrl: string): WebAiConnection {
    // BE가 상대 경로를 반환하면 BE API의 origin을 사용한다. FE의 localhost origin으로 바꾸지 않는다.
    const origin = new URL(apiBaseUrl).origin;
    const promptUrl = new URL(connection.promptUrl, origin).href;
    const resultUrl = new URL(connection.resultUrl, origin).href;
    return {
        ...connection,
        promptUrl,
        resultUrl,
        bootstrapPrompt: connection.bootstrapPrompt
            .split(connection.promptUrl).join(promptUrl)
            .split(connection.resultUrl).join(resultUrl),
    };
}

export function parseWebAiResultImport(raw: string): WebAiResultImport {
    // 복사 시 코드 블록까지 포함해도 JSON 내용은 그대로 읽는다. 세부 검증과 소유권은 서버가 검사한다.
    const text = raw.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_RESULT_JSON");
    const record = value as Record<string, unknown>;
    if (typeof record.runId !== "string" || !record.runId ||
        typeof record.submissionId !== "string" || !record.submissionId ||
        typeof record.originalFeedbackMarkdown !== "string" || !Array.isArray(record.items) || record.items.length === 0) {
        throw new Error("INVALID_RESULT_JSON");
    }
    return value as WebAiResultImport;
}
