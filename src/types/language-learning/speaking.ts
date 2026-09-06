export type SpeakingTopicCategory =
    | "DAILY"
    | "TRAVEL"
    | "FOOD"
    | "SHOPPING"
    | "BUSINESS"
    | "IT"
    | "HOBBY"
    | "GAME"
    | "CULTURE"
    | "FREE_TALK";

export type SpeakingPracticeMode = "READ_ALOUD" | "GUIDED" | "FREE";

export type ConversationStartMode =
    | "AI_FIRST"
    | "USER_FIRST"
    | "TOPIC_RECOMMENDED";

export type CorrectionMode = "CONVERSATION" | "COACHING";

export type AssistanceType =
    | "REPLAY"
    | "SLOW_PLAYBACK"
    | "SHOW_QUESTION"
    | "HINT"
    | "TRANSLATION"
    | "SAMPLE_ANSWER";

export type SpeakingSessionStatus =
    | "IN_PROGRESS"
    | "COMPLETED"
    | "EVALUATING"
    | "EVALUATED"
    | "EVALUATION_FAILED"
    | "EXPIRED";

export type SpeakingEvaluationStatus =
    | "NOT_REQUESTED"
    | "PENDING"
    | "EVALUATING"
    | "EVALUATED"
    | "INSUFFICIENT_EVIDENCE"
    | "FAILED";

export type SpeakingTurnStatus =
    | "AWAITING_UPLOAD"
    | "UPLOADED"
    | "PROCESSING"
    | "READY"
    | "PARTIAL_FAILURE"
    | "FAILED"
    | "EXCLUDED";

export type SpeakingStage =
    | "AUDIO_VALIDATION"
    | "STT"
    | "CONVERSATION"
    | "TTS"
    | "EVALUATION";

export type SpeakingMetricType =
    | "GRAMMAR"
    | "VOCABULARY"
    | "NATURALNESS"
    | "MEANING"
    | "EXPRESSIVENESS"
    | "FLUENCY"
    | "PRONUNCIATION"
    | "INTERACTION";

export type MetricEvaluationState = "EVALUATED" | "NOT_EVALUABLE";

export type SttReportType =
    | "WRONG_TEXT"
    | "MISSING_TEXT"
    | "LANGUAGE_MISMATCH"
    | "OTHER";

export interface SpeakingTopic {
    id: number;
    topicCode: string;
    category: SpeakingTopicCategory;
    title: string;
    description: string;
    originLanguage: string | null;
    learningLanguage: string | null;
    recommendedLevel: string | null;
    recommendedStartMode: ConversationStartMode | null;
    sortOrder: number;
    version: number;
}

export interface SpeakingDailyUsage {
    sessionCount: number;
    usedMinutes: number;
    dailySessionLimit: number;
    dailySpeakingHardLimitMinutes: number;
    dailyGoalMinutes: number;
}

export interface SpeakingSession {
    id: number;
    learningDate: string;
    topicId: number | null;
    topicTitle: string | null;
    topicCategory: string | null;
    topicVersion: number | null;
    customTopic: string | null;
    goal: string | null;
    persona: string | null;
    originLanguage: string;
    learningLanguage: string;
    status: SpeakingSessionStatus;
    evaluationStatus: SpeakingEvaluationStatus;
    practiceMode: SpeakingPracticeMode;
    conversationStartMode: ConversationStartMode;
    resolvedStartMode: ConversationStartMode;
    correctionMode: CorrectionMode;
    targetMinutes: number;
    maxTurns: number;
    completedTurns: number;
    totalDurationSeconds: number;
    voiceId: string | null;
    playbackSpeed: string | null;
    openingAssistantText: string | null;
    openingPromptGuide: SpeakingPromptGuide;
    openingAssistantAudioUrl: string | null;
    sessionSummary: string | null;
    startedAt: string;
    completedAt: string | null;
    lastActivityAt: string;
}

export interface SpeakingTurn {
    id: number;
    turnIndex: number;
    status: SpeakingTurnStatus;
    durationSeconds: number;
    transcript: string | null;
    sttConfidence: number | null;
    userAudioUrl: string | null;
    assistantText: string | null;
    promptGuide: SpeakingPromptGuide;
    assistantAudioUrl: string | null;
    assistanceUsage: AssistanceType[];
    excludedFromEvaluation: boolean;
    failedStage: SpeakingStage | null;
    errorCode: string | null;
    errorMessage: string | null;
    manualRetryCount: number;
    completedAt: string | null;
}


export interface SpeakingPromptGuide {
    scriptText: string | null;
    providedFacts: string[];
    requiredIntents: string[];
    responseConstraints: string[];
}

export interface SpeakingPracticeModeStatus {
    practiceMode: SpeakingPracticeMode;
    sessionId: number | null;
    sessionStatus: SpeakingSessionStatus | null;
    evaluationStatus: SpeakingEvaluationStatus | null;
    completedTurns: number;
    maxTurns: number;
    completed: boolean;
}

export interface SpeakingEvaluationEligibility {
    validUserTurns: number;
    validUserSpeechSeconds: number;
    validSttTurnRatio: number;
    requiredUserTurns: number;
    requiredUserSpeechSeconds: number;
    requiredSttTurnRatio: number;
    requiredEvaluationConfidence: number;
    eligible: boolean;
    missingRequirements: string[];
}

export interface SpeakingSessionDetail {
    session: SpeakingSession;
    dailyUsage: SpeakingDailyUsage;
    turns: SpeakingTurn[];
    evaluationEligibility: SpeakingEvaluationEligibility;
    resumable: boolean;
}

export interface SpeakingSessionCreateRequest {
    topicId: number | null;
    customTopic: string | null;
    goal: string | null;
    persona: string | null;
    practiceMode: SpeakingPracticeMode;
    conversationStartMode: ConversationStartMode;
    correctionMode: CorrectionMode;
    targetMinutes: number;
    voiceId: string;
    playbackSpeed: string;
    idempotencyKey: string;
}

export interface SpeakingTurnUploadGrant {
    turnId: number;
    turnIndex: number;
    uploadToken: string;
    uploadUrl: string;
    expiresAt: string;
}

export interface SpeakingTurnProcessRequest {
    turnId: number;
    uploadToken: string;
    durationSeconds: number;
    assistanceUsage: AssistanceType[];
}

export interface SpeakingMetric {
    metricType: SpeakingMetricType;
    state: MetricEvaluationState;
    score: number | null;
    confidence: number;
    summary: string | null;
    notEvaluableReason: string | null;
    evidenceJson: string | null;
}

export interface SpeakingEvaluation {
    evaluationId: number | null;
    sessionId: number;
    status: SpeakingEvaluationStatus | string;
    overallScore: number | null;
    evaluationConfidence: number | null;
    metrics: SpeakingMetric[];
    strengthsJson: string | null;
    improvementsJson: string | null;
    recommendedExpressionsJson: string | null;
    pronunciationPracticeJson: string | null;
    eligibilityJson: string | null;
    evaluationVersion: string | null;
    scoringPolicyVersion: string | null;
    promptVersion: string | null;
    evaluatedAt: string | null;
}

export interface SpeakingEvaluationEvidence {
    turnId?: string;
    turnIndex?: number;
    startMs?: number;
    endMs?: number;
    message?: string;
    quote?: string;
    reason?: string;
    [key: string]: unknown;
}

export interface SpeakingRecommendedExpression {
    original?: string;
    recommended?: string;
    explanation?: string;
    evidenceTurnIds?: string[];
    [key: string]: unknown;
}

export interface SpeakingPronunciationPractice {
    target?: string;
    practicePhrase?: string;
    reason?: string;
    evidenceTurnIds?: string[];
    [key: string]: unknown;
}


export interface SpeakingAssistanceRequest {
    type: AssistanceType;
    targetTurnId: number | null;
}

export interface SpeakingAssistanceResponse {
    type: AssistanceType;
    targetTurnId: number | null;
    appliesToTurnIndex: number;
    content: string | null;
    audioUrl: string | null;
    playbackRate: number;
}

export interface SttErrorReportCreateRequest {
    reportType: SttReportType;
    expectedText: string | null;
    audioAnalysisConsent: boolean;
    clientAudioMetadata: Record<string, unknown>;
    supportRequested: boolean;
}

export interface SttErrorReport {
    id: number;
    reportReference: string;
    sessionId: number;
    turnId: number;
    reportType: SttReportType;
    reportStatus: string;
    expectedText: string | null;
    audioAnalysisConsent: boolean;
    audioRetentionUntil: string | null;
    supportRequested: boolean;
    supportReference: string | null;
    resolvedAt: string | null;
}
