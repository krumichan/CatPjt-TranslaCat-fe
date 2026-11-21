export const BOARD_TOPIC_TYPES = ["MEMBER", "ANONYMOUS"] as const;
export type BoardTopicType = (typeof BOARD_TOPIC_TYPES)[number];
export const BOARD_TYPES = [...BOARD_TOPIC_TYPES, "ADMIN"] as const;
export type Board = (typeof BOARD_TYPES)[number];
export type BoardLocale = "ko" | "ja" | "en";
export type BoardSort = "LATEST" | "POPULAR";
export type BoardReaction = "LIKE" | "DISLIKE" | "NONE";

export interface BoardForum {
    id: string;
    type: Board;
    name: string | null;
}

export interface BoardReactions {
    likes: number;
    dislikes: number;
    mine: BoardReaction;
}

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
    viewCount?: number | null;
    reactions?: BoardReactions | null;
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
