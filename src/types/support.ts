export type SupportTab = "inquiries" | "notices" | "messages";
export type SupportInquiryStatus = "WAITING" | "ANSWERED" | "CLOSED";
export type SupportNoticeType = "NORMAL" | "URGENT";
export type SupportCategory =
    | "GENERAL"
    | "ACCOUNT"
    | "TRANSLATION"
    | "LEARNING"
    | "CHAT"
    | "ACCOUNT_BOOK"
    | "OTHER";

export interface SupportUser {
    id: number;
    name: string;
    email: string;
    publicId: string;
}

export interface SupportReply {
    id: number;
    parentId: number | null;
    content: string;
    authorRole: string;
    authorName: string;
    createdAt: string;
}

export interface SupportInquiry {
    id: number;
    title: string;
    content: string;
    category: SupportCategory;
    status: SupportInquiryStatus;
    user: SupportUser;
    createdAt: string;
    updatedAt: string;
    unread: boolean;
    replyCount?: number;
    relatedMessageId?: number | null;
    replies?: SupportReply[];
}

export interface SupportNotice {
    id: number;
    title: string;
    content: string;
    noticeType: SupportNoticeType;
    authorName: string;
    createdAt: string;
    updatedAt: string;
}

export interface SupportMessage {
    id: number;
    title: string;
    content: string;
    senderName: string;
    recipient: SupportUser;
    createdAt: string;
    readAt: string | null;
}

export type SupportItem = SupportInquiry | SupportNotice | SupportMessage;

export interface SupportPage<T> {
    items: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export interface SupportDraft {
    title: string;
    content: string;
    category: SupportCategory;
    noticeType: SupportNoticeType;
    recipient: SupportUser | null;
    relatedMessageId?: number;
}

export interface SupportListOptions {
    page: number;
    status?: SupportInquiryStatus;
    search?: string;
}
