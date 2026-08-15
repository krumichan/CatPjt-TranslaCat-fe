export interface LanguageLearningUserSetting {
    originLanguage: string | null;
    learningLanguage: string | null;
    timezone: string;
    dailySentenceCount: number;
    pendingOriginLanguage: string | null;
    pendingLearningLanguage: string | null;
    pendingTimezone: string | null;
    pendingDailySentenceCount: number | null;
    pendingEffectiveDate: string | null;
    minDailySentenceCount: number;
    maxDailySentenceCount: number;
    configured: boolean;
}

export interface LanguageLearningUserSettingUpdateRequest {
    originLanguage: string;
    learningLanguage: string;
    timezone: string;
    dailySentenceCount: number;
}

export interface LanguageLearningAdminSetting {
    defaultDailySentenceCount: number;
    minDailySentenceCount: number;
    maxDailySentenceCount: number;
    dailyKeywordMaxCount: number;
    reviewAvailableDays: number;
    levelRecheckRecommendationDays: number;
    adaptiveWritingEnabled: boolean;
    aiEvaluationEnabled: boolean;
}

export type LanguageLearningAdminSettingUpdateRequest =
    LanguageLearningAdminSetting;
