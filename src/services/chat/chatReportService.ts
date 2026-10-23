import { apiClient } from "@/lib/apiClient";
import { REPORT_STATUSES, parseReportDetail, parseReportList, parseReportReceipt, safeReportId, type ReportRequest, type ReportStatus } from "@/features/chat-reports/model";

export class ChatReportError extends Error {
    constructor(readonly status: number) { super("CHAT_REPORT_REQUEST_FAILED"); }
}
type Context = { owner: string; signal: AbortSignal };

async function request(path: string, options: RequestInit, context: Context): Promise<unknown> {
    const controller = new AbortController();
    let rejectInterruption: (error: Error) => void = () => {};
    const interruption = new Promise<never>((_, reject) => { rejectInterruption = reject; });
    const stop = () => {
        controller.abort();
        const error = new Error("CHAT_REPORT_ABORTED");
        error.name = "AbortError";
        rejectInterruption(error);
    };
    const timer = setTimeout(stop, 15000);
    context.signal.addEventListener("abort", stop, { once: true });
    try {
        context.signal.throwIfAborted();
        // 인증 조회와 응답 파싱까지 같은 deadline/로그인 세대에 귀속하며 mutation을 자동 재전송하지 않는다.
        const work = async () => {
            const response = await apiClient(path, { ...options, cache: "no-store", signal: controller.signal }, context.owner);
            if (!response.ok) throw new ChatReportError(response.status);
            const json = await response.json() as { body?: unknown };
            controller.signal.throwIfAborted();
            return json.body;
        };
        // fetch 대체 구현이나 body reader가 abort를 무시해도 화면의 대기/잠금은 deadline에 끝난다.
        return await Promise.race([work(), interruption]);
    } finally {
        clearTimeout(timer);
        context.signal.removeEventListener("abort", stop);
    }
}

export const chatReportService = {
    async create(roomId: number, body: ReportRequest, context: Context) {
        const result = parseReportReceipt(await request(`/chat/rooms/${safeReportId(roomId)}/reports`, { method: "POST", body: JSON.stringify(body) }, context));
        if (result.roomId !== roomId || result.targetType !== body.targetType || result.reason !== body.reason) throw new Error("REPORT_INVALID_RESPONSE");
        return result;
    },
    async list(status: ReportStatus | "", cursorId: number | null, context: Context) {
        if (status !== "" && !REPORT_STATUSES.includes(status)) throw new Error("REPORT_INVALID_INPUT");
        const query = new URLSearchParams({ size: "25" });
        if (status) query.set("status", status);
        if (cursorId !== null) query.set("cursorId", String(safeReportId(cursorId)));
        return parseReportList(await request(`/admin/chat/reports?${query}`, { method: "GET" }, context));
    },
    async detail(id: number, context: Context) {
        const result = parseReportDetail(await request(`/admin/chat/reports/${safeReportId(id)}`, { method: "GET" }, context));
        if (result.id !== id) throw new Error("REPORT_INVALID_RESPONSE");
        return result;
    },
    async review(id: number, status: ReportStatus, reviewNote: string, expectedVersion: number, context: Context) {
        if (!REPORT_STATUSES.includes(status) || typeof reviewNote !== "string" || reviewNote.length > 2000
            || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new Error("REPORT_INVALID_INPUT");
        const result = parseReportDetail(await request(`/admin/chat/reports/${safeReportId(id)}/status`, {
            method: "PATCH", body: JSON.stringify({ status, reviewNote: reviewNote.trim(), expectedVersion }),
        }, context));
        if (result.id !== id || result.version <= expectedVersion) throw new Error("REPORT_INVALID_RESPONSE");
        return result;
    },
};
