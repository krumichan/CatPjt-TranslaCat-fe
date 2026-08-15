export interface LanguageLearningUserSetting {
    originLanguage: string | null;
    learningLanguage: string | null;
    timezone: string;
    dailySentenceCount: number;
    dailySpeakingGoalMinutes: number;
    speakingVoiceId: string | null;
    speakingPlaybackSpeed: string | null;
    pendingOriginLanguage: string | null;
    pendingLearningLanguage: string | null;
    pendingTimezone: string | null;
    pendingDailySentenceCount: number | null;
    pendingDailySpeakingGoalMinutes: number | null;
    pendingEffectiveDate: string | null;
    minDailySentenceCount: number;
    maxDailySentenceCount: number;
    minDailySpeakingGoalMinutes: number;
    maxDailySpeakingGoalMinutes: number;
    configured: boolean;
}

export interface LanguageLearningUserSettingUpdateRequest {
    originLanguage: string;
    learningLanguage: string;
    timezone: string;
    dailySentenceCount: number;
    dailySpeakingGoalMinutes: number;
    speakingVoiceId: string;
    speakingPlaybackSpeed: string;
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
    speakingEnabled: boolean;
    speakingEvaluationEnabled: boolean;
    defaultDailySpeakingGoalMinutes: number;
    minDailySpeakingGoalMinutes: number;
    maxDailySpeakingGoalMinutes: number;
    dailySpeakingHardLimitMinutes: number;
    dailySpeakingSessionLimit: number;
    maxSessionMinutes: number;
    maxTurnsPerSession: number;
    minValidAudioSeconds: number;
    maxTurnAudioSeconds: number;
    maxAudioFileBytes: number;
    rawAudioRetentionDays: number;
    reportedAudioRetentionDays: number;
    activeSessionResumeHours: number;
    automaticRetryLimitPerStage: number;
    manualRetryLimitPerStage: number;
    sttTimeoutSeconds: number;
    ttsTimeoutSeconds: number;
    evaluationTimeoutSeconds: number;
}

export type LanguageLearningAdminSettingUpdateRequest =
    LanguageLearningAdminSetting;
