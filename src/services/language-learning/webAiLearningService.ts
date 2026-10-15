import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import { resolveWebAiConnection } from "@/features/language-learning/web-ai/webAiApi";
import type { WebAiConnection, WebAiPlan, WebAiPlanRequest, WebAiResult, WebAiResultImport, WebAiRun } from "@/types/language-learning/webAi";

const BASE = "/language-learning/web-ai";

export function createWebAiLearningService(expectedLoginSessionId?: string) {
    async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
        const response = await apiClient(`${BASE}${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }, expectedLoginSessionId);
        return parseResponseBody<T>(response, "WebAiLearning");
    }

    return {
        listPlans: () => request<{ plans: WebAiPlan[] }>("/plans"),
        createPlan: (body: WebAiPlanRequest) => request<WebAiPlan>("/plans", "POST", body),
        updatePlan: (id: string, body: WebAiPlanRequest) => request<WebAiPlan>(`/plans/${encodeURIComponent(id)}`, "PUT", body),
        deletePlan: async (id: string) => {
            const response = await apiClient(`${BASE}/plans/${encodeURIComponent(id)}`, { method: "DELETE" }, expectedLoginSessionId);
            if (!response.ok) await parseResponseBody(response, "WebAiLearning");
        },
        createConnection: async (id: string) => {
            const connection = await request<WebAiConnection>(`/plans/${encodeURIComponent(id)}/connection`, "POST");
            return resolveWebAiConnection(connection, process.env.NEXT_PUBLIC_API_URL ?? "");
        },
        revokeConnection: async (id: string) => {
            const response = await apiClient(`${BASE}/plans/${encodeURIComponent(id)}/connection`, { method: "DELETE" }, expectedLoginSessionId);
            if (!response.ok) await parseResponseBody(response, "WebAiLearning");
        },
        createRun: (id: string, executionKey: string) => request<WebAiRun>(`/plans/${encodeURIComponent(id)}/runs`, "POST", { executionKey }),
        importResult: (body: WebAiResultImport) => request<WebAiResult>("/results", "POST", body),
        getResult: (id: string) => request<WebAiResult>(`/results/${encodeURIComponent(id)}`),
        retryResult: (id: string) => request<WebAiResult>(`/results/${encodeURIComponent(id)}/retry`, "POST"),
    };
}

export const webAiLearningService = createWebAiLearningService();
