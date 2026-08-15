import type {
    KeywordSource,
    KeywordType,
} from "@/types/language-learning/common";

export interface LanguageLearningKeyword {
    id: number;
    text: string;
    source: KeywordSource;
    type: KeywordType;
    canonicalKey: string;
    active: boolean;
    selected: boolean;
    pendingEffectiveDate: string | null;
}

export interface LanguageLearningKeywordList {
    systemKeywords: LanguageLearningKeyword[];
    customKeywords: LanguageLearningKeyword[];
}

export interface LanguageLearningKeywordCreateRequest {
    text: string;
    type: KeywordType;
    canonicalKey?: string | null;
}

export interface LanguageLearningKeywordUpdateRequest {
    text?: string | null;
    type?: KeywordType | null;
    canonicalKey?: string | null;
    active?: boolean | null;
}

export interface SystemKeywordSelectionRequest {
    selected: boolean;
}
