import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    SupportCategory,
    SupportInquiry,
    SupportListOptions,
    SupportMessage,
    SupportNotice,
    SupportNoticeType,
    SupportPage,
    SupportUser,
} from "@/types/support";

async function request<T>(
    path: string,
    options?: RequestInit,
    expectedLoginSessionId?: string,
): Promise<T> {
    const response = await apiClient(`/support${path}`, options, expectedLoginSessionId);

    return parseResponseBody<T>(response, "Support");
}

function listParams(options: SupportListOptions): string {
    const params = new URLSearchParams({
        page: String(options.page),
        size: "20",
    });

    if (options.status) {
        params.set("status", options.status);
    }

    if (options.search?.trim()) {
        params.set("search", options.search.trim());
    }

    return params.toString();
}

export const supportService = {
    listInquiries: (options: SupportListOptions) =>
        request<SupportPage<SupportInquiry>>(`/inquiries?${listParams(options)}`),

    getInquiry: (id: number) => request<SupportInquiry>(`/inquiries/${id}`),

    createInquiry: (body: {
        title: string;
        content: string;
        category: SupportCategory;
        relatedMessageId?: number;
    }) => request<SupportInquiry>("/inquiries", {
        method: "POST",
        body: JSON.stringify(body),
    }),

    reply: (id: number, body: { content: string; parentId?: number }) =>
        request<SupportInquiry>(`/inquiries/${id}/replies`, {
            method: "POST",
            body: JSON.stringify(body),
        }),

    updateStatus: (id: number, status: "WAITING" | "CLOSED") =>
        request<SupportInquiry>(`/inquiries/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status }),
        }),

    listNotices: (options: SupportListOptions) =>
        request<SupportPage<SupportNotice>>(`/notices?${listParams(options)}`),

    getNotice: (id: number) => request<SupportNotice>(`/notices/${id}`),

    listUrgentNotices: (signal?: AbortSignal, loginSessionId?: string) =>
        request<SupportNotice[]>("/notices/urgent", { signal }, loginSessionId),

    dismissUrgentNotice: (id: number, loginSessionId?: string) =>
        request<boolean>(`/notices/${id}/dismiss`, {
            method: "PUT",
            signal: AbortSignal.timeout(10000),
        }, loginSessionId),

    saveNotice: (body: { title: string; content: string; noticeType: SupportNoticeType }, id?: number) =>
        request<SupportNotice>(id ? `/notices/${id}` : "/notices", {
            method: id ? "PUT" : "POST",
            body: JSON.stringify(body),
        }),

    deleteNotice: (id: number) => request<boolean>(`/notices/${id}`, {
        method: "DELETE",
    }),

    listMessages: (options: SupportListOptions) =>
        request<SupportPage<SupportMessage>>(`/messages?${listParams(options)}`),

    getMessage: (id: number) => request<SupportMessage>(`/messages/${id}`),

    sendMessage: (body: { recipientId: number; title: string; content: string }) =>
        request<SupportMessage>("/messages", {
            method: "POST",
            body: JSON.stringify(body),
        }),

    searchRecipients: (query: string, signal?: AbortSignal) =>
        request<SupportUser[]>(`/recipients?${new URLSearchParams({ query: query.trim() })}`, {
            signal,
        }),
};
