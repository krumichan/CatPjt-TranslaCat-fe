import { ApiResponseError } from "@/services/common/responseParser";
import type {
    SupportInquiryStatus,
    SupportReply,
    SupportTab,
} from "@/types/support";

export const SUPPORT_CATEGORIES = [
    "GENERAL", "ACCOUNT", "TRANSLATION", "LEARNING", "CHAT", "ACCOUNT_BOOK", "OTHER",
] as const;

export function parseSupportTab(value: string | null): SupportTab {
    return value === "notices" || value === "messages" ? value : "inquiries";
}

export function parseSupportId(value: string | null): number | null {
    if (!value || !/^\d+$/.test(value)) {
        return null;
    }

    const id = Number(value);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function parseSupportStatus(value: string | null): SupportInquiryStatus | undefined {
    return value === "WAITING" || value === "ANSWERED" || value === "CLOSED"
        ? value
        : undefined;
}

export function supportErrorKey(error: unknown): string {
    if (error instanceof ApiResponseError) {
        if (error.status === 403) {
            return "forbidden";
        }

        if (error.status === 404) {
            return "notFound";
        }

        if (error.status === 409) {
            return "conflict";
        }
    }

    return "requestFailed";
}

export interface SupportReplyNode {
    reply: SupportReply;
    parent: SupportReply | null;
    depth: number;
}

export function buildSupportReplyThread(replies: SupportReply[]): SupportReplyNode[] {
    // 부모 바로 아래에 자식 답글을 배치하되 모바일 들여쓰기는 화면에서 제한한다.
    const byId = new Map(replies.map((reply) => [reply.id, reply]));
    const children = new Map<number | null, SupportReply[]>();

    for (const reply of replies) {
        const parentId = reply.parentId !== null && byId.has(reply.parentId)
            ? reply.parentId
            : null;
        const siblings = children.get(parentId) ?? [];

        siblings.push(reply);
        children.set(parentId, siblings);
    }

    const result: SupportReplyNode[] = [];
    const visited = new Set<number>();
    const stack = [...(children.get(null) ?? [])].reverse().map((reply) => ({ reply, depth: 0 }));

    while (stack.length > 0) {
        const current = stack.pop()!;

        if (visited.has(current.reply.id)) {
            continue;
        }

        visited.add(current.reply.id);
        result.push({
            ...current,
            parent: byId.get(current.reply.parentId ?? -1) ?? null,
        });

        for (const child of [...(children.get(current.reply.id) ?? [])].reverse()) {
            stack.push({ reply: child, depth: current.depth + 1 });
        }
    }

    // 비정상 부모 참조가 있더라도 답글 자체를 화면에서 누락하지 않는다.
    for (const reply of replies) {
        if (!visited.has(reply.id)) {
            result.push({ reply, parent: null, depth: 0 });
        }
    }

    return result;
}
