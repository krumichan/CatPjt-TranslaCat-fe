export type ReceiptKeywordType =
    | "STOP_AFTER"
    | "IMPORTANT"
    | "EXCLUDE_ITEM";

export type ReceiptOcrLanguage = "japan" | "korean" | "en";

export type ReceiptOcrSetting = {
    id: number;
    currencyCode: string;
    ocrLanguage: ReceiptOcrLanguage | string;
    enabled: boolean;
    deleted?: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type ReceiptOcrSettingUpdateRequest = {
    ocrLanguage: string;
    enabled: boolean;
};

export type ReceiptKeyword = {
    id: number;
    keywordType: ReceiptKeywordType;
    keyword: string;
    currencyCode?: string | null;
    ocrLanguage: string;
    enabled: boolean;
    displayOrder?: number | null;
};

export type ReceiptKeywordCreateRequest = {
    keywordType: ReceiptKeywordType;
    keyword: string;
    currencyCode?: string | null;
    ocrLanguage: string;
    enabled?: boolean;
    displayOrder?: number | null;
};

export type ReceiptKeywordUpdateRequest = {
    keywordType: ReceiptKeywordType;
    keyword: string;
    currencyCode?: string | null;
    ocrLanguage: string;
    enabled: boolean;
    displayOrder?: number | null;
};