import {TranslationUnit} from "@/types/common";

export interface Novel {
    rank: number | undefined | null;
    identifier: string;
    isShortStory: boolean;
    title: TranslationUnit;
    author: TranslationUnit;
    status: TranslationUnit;
    synopsis: TranslationUnit;
}