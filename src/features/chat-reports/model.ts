export const REPORT_REASONS = ["SPAM", "HARASSMENT", "HATE", "SEXUAL", "ILLEGAL", "PERSONAL_INFORMATION", "OTHER"] as const;
export const REPORT_STATUSES = ["PENDING", "IN_REVIEW", "RESOLVED", "DISMISSED"] as const;
export type ReportReason = typeof REPORT_REASONS[number];
export type ReportStatus = typeof REPORT_STATUSES[number];
export type ReportTarget = { roomId: number; displayName: string } & (
    { targetType: "MESSAGE"; messageId: number } |
    { targetType: "MEMBER"; targetOpenChatMemberId: number; targetUserId?: never } |
    { targetType: "MEMBER"; targetUserId: number; targetOpenChatMemberId?: never }
);
export type ReportRequest = { targetType: "MESSAGE" | "MEMBER"; reason: ReportReason; detail: string; clientRequestId: string;
    messageId?: number; targetOpenChatMemberId?: number; targetUserId?: number };
export interface ReportReceipt {
    id: number; roomId: number; targetType: "MESSAGE" | "MEMBER"; reason: ReportReason; status: ReportStatus;
    createdAt: string; evidenceExpiresAt: string; duplicate: boolean; version: number; evidenceExpired: boolean;
}
export interface ReportDetail extends ReportReceipt {
    detail: string; evidenceContent: string | null; evidenceSenderDisplay: string | null; reviewNote: string | null; updatedAt: string;
}
export interface ReportList { reports: ReportReceipt[]; nextCursorId: number | null; hasNext: boolean }

export function safeReportId(value: unknown): number {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new Error("REPORT_INVALID_ID");
    return value;
}
function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("REPORT_INVALID_RESPONSE");
    return value as Record<string, unknown>;
}
function text(value: unknown, maximum = 2000): string {
    if (typeof value !== "string" || value.length > maximum) throw new Error("REPORT_INVALID_RESPONSE");
    return value;
}
function date(value: unknown): string {
    const result = text(value, 64);
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(result) || !Number.isFinite(Date.parse(result))) throw new Error("REPORT_INVALID_RESPONSE");
    return result;
}
function boolean(value: unknown): boolean {
    if (typeof value !== "boolean") throw new Error("REPORT_INVALID_RESPONSE");
    return value;
}
function member<T extends string>(value: unknown, values: readonly T[]): T {
    if (typeof value !== "string" || !values.includes(value as T)) throw new Error("REPORT_INVALID_RESPONSE");
    return value as T;
}
export function parseReportReceipt(value: unknown): ReportReceipt {
    const row = object(value);
    if (typeof row.version !== "number" || !Number.isSafeInteger(row.version) || row.version < 0) throw new Error("REPORT_INVALID_RESPONSE");
    return { id: safeReportId(row.id), roomId: safeReportId(row.roomId), targetType: member(row.targetType, ["MESSAGE", "MEMBER"]),
        reason: member(row.reason, REPORT_REASONS), status: member(row.status, REPORT_STATUSES), createdAt: date(row.createdAt),
        evidenceExpiresAt: date(row.evidenceExpiresAt), duplicate: boolean(row.duplicate), version: row.version, evidenceExpired: boolean(row.evidenceExpired) };
}
export function parseReportDetail(value: unknown, now = Date.now()): ReportDetail {
    const row = object(value);
    const receipt = parseReportReceipt(row);
    const expired = receipt.evidenceExpired || Date.parse(receipt.evidenceExpiresAt) <= now;
    // 만료된 증거가 지연 응답에 남아 있어도 UI 상태에는 원문과 표시 이름을 보관하지 않는다.
    return { ...receipt, evidenceExpired: expired, detail: row.detail == null ? "" : text(row.detail),
        evidenceContent: expired || row.evidenceContent == null ? null : text(row.evidenceContent, 100000),
        evidenceSenderDisplay: expired || row.evidenceSenderDisplay == null ? null : text(row.evidenceSenderDisplay, 500),
        reviewNote: row.reviewNote == null ? null : text(row.reviewNote), updatedAt: date(row.updatedAt) };
}
export function parseReportList(value: unknown): ReportList {
    const row = object(value);
    if (!Array.isArray(row.reports) || row.reports.length > 100) throw new Error("REPORT_INVALID_RESPONSE");
    const reports = row.reports.map(parseReportReceipt);
    if (new Set(reports.map(report => report.id)).size !== reports.length) throw new Error("REPORT_INVALID_RESPONSE");
    const hasNext = boolean(row.hasNext);
    const nextCursorId = row.nextCursorId == null ? null : safeReportId(row.nextCursorId);
    if (hasNext && nextCursorId == null) throw new Error("REPORT_INVALID_RESPONSE");
    return { reports, nextCursorId, hasNext };
}
export function createReportRequest(target: ReportTarget, reason: ReportReason, detail: string, clientRequestId: string): ReportRequest {
    // 실수로 서로 다른 식별자가 섞여도 OPEN 멤버와 실제 계정의 대상을 추측해서 보내지 않는다.
    safeReportId(target.roomId);
    const identities = ["messageId", "targetOpenChatMemberId", "targetUserId"].filter(key => key in target);
    if (identities.length !== 1 || (target.targetType !== "MESSAGE" && target.targetType !== "MEMBER")
        || (target.targetType === "MESSAGE") !== ("messageId" in target)
        || !REPORT_REASONS.includes(reason) || typeof detail !== "string" || detail.length > 2000
        || typeof clientRequestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(clientRequestId)) throw new Error("REPORT_INVALID_INPUT");
    const base = { targetType: target.targetType, reason, detail: detail.trim(), clientRequestId };
    if (target.targetType === "MESSAGE") return { ...base, messageId: safeReportId(target.messageId) };
    return "targetOpenChatMemberId" in target && target.targetOpenChatMemberId !== undefined
        ? { ...base, targetOpenChatMemberId: safeReportId(target.targetOpenChatMemberId) }
        : { ...base, targetUserId: safeReportId(target.targetUserId) };
}
