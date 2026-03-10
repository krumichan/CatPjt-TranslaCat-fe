import {useTranslations} from "next-intl";

export interface TranslationUnit {
    rawJa: string;
    ja: string;
    ko: string;
}

export interface PageNumber {
    firstPage: number | null;
    prevPage: number | null;
    nextPage: number | null;
    lastPage: number | null;

    currentPage: number;
    pages: number[] | null;
}

export const RECENT_VIEW_TYPE = {
    NOVEL: 'NOVEL',
    EPISODE: 'EPISODE',
} as const;

export type RecentViewType = typeof RECENT_VIEW_TYPE[keyof typeof RECENT_VIEW_TYPE];

export type GeneralTranslation = ReturnType<typeof useTranslations>;
