export type Board = "ADMIN" | "MEMBER" | "ANONYMOUS";
export type BoardLocale = "ko" | "ja" | "en";

export interface BoardAttachment {
    id: string;
    filename: string;
    bytes: number;
}

export interface BoardEntry {
    id: string;
    locked: boolean;
    secret: boolean;
    mine: boolean;
    author: string | null;
    createdAt: string;
    updatedAt: string;
    title: string | null;
    content: string | null;
    translatedTitle: string | null;
    translatedContent: string | null;
    translating: boolean;
    attachments: BoardAttachment[];
}

export interface BoardPage {
    items: BoardEntry[];
    hasMore: boolean;
}

export interface BoardDraft {
    title?: string;
    content: string;
    password?: string;
    attachments?: string[];
}
