export type ListeningTaskType =
    | "DICTATION"
    | "INTERPRETATION"
    | "REPEAT_AFTER_AUDIO"
    | "COMPREHENSION"
    | "SUMMARY";

export type ListeningLearningMode = "DICTATION" | "COMPREHENSION" | "SUMMARY";

export type ListeningAssistanceType =
    | "REPLAY"
    | "SLOW_PLAYBACK"
    | "TOPIC_HINT"
    | "KEYWORD_HINT"
    | "SHOW_ANSWER";

export type ListeningAssistanceLevel = "INDEPENDENT" | "ASSISTED" | "GUIDED";
export type ListeningPlaybackType = "NORMAL" | "SLOW";
export type ListeningDifficulty = "EASY" | "MY_LEVEL" | "CHALLENGE";
export type ListeningDailySetStatus = "GENERATING" | "READY" | "PARTIAL" | "COMPLETED" | "FAILED";
export type ListeningItemStatus = "TTS_PENDING" | "READY" | "NOT_EVALUABLE" | "REPLACED";
export type ListeningSessionStatus = "READY" | "IN_PROGRESS" | "EVALUATING" | "COMPLETED" | "ABANDONED";
export type ListeningAttemptStatus =
    | "READY"
    | "IN_PROGRESS"
    | "SUBMITTED"
    | "EVALUATING"
    | "EVALUATED"
    | "NOT_EVALUABLE"
    | "SKIPPED";
export type ListeningTaskStatus =
    | "READY"
    | "IN_PROGRESS"
    | "SUBMITTED"
    | "EVALUATING"
    | "EVALUATED"
    | "EVALUATION_FAILED"
    | "NOT_SELECTED"
    | "NOT_EVALUABLE"
    | "SKIPPED";
export type ListeningEvaluationPurpose = "OFFICIAL" | "PRACTICE";
export type ListeningWeaknessState = "DATA_COLLECTING" | "ACTIVE" | "IMPROVING" | "RESOLVED";
export type ListeningRecommendationStatus = "ACTIVE" | "DISMISSED" | "RESOLVED" | "EXPIRED";
export type ListeningProfileMetric =
    | "LISTENING_RECOGNITION"
    | "LISTENING_INDEPENDENCE"
    | "VOCABULARY"
    | "ORTHOGRAPHY"
    | "MEANING"
    | "ORIGIN_NATURALNESS"
    | "PRONUNCIATION"
    | "FLUENCY"
    | "SPOKEN_EXPRESSION"
    | "INTERACTION"
    | "WRITTEN_EXPRESSION";

export interface ListeningAssistanceUsage {
    type: ListeningAssistanceType;
    count: number;
}

export interface ListeningDailySetCreateRequest {
    itemCount?: number | null;
    difficulty?: ListeningDifficulty | null;
    learningMode?: ListeningLearningMode | null;
    idempotencyKey?: string | null;
}

export interface ListeningItemSummary {
    itemId: number;
    itemIndex: number;
    replacementSequence: number;
    status: ListeningItemStatus;
    playable: boolean;
    audioDurationMs: number | null;
}

export interface ListeningDailySet {
    dailySetId: number;
    learningDate: string;
    originLanguage: string;
    learningLanguage: string;
    learningMode: ListeningLearningMode;
    difficulty: ListeningDifficulty;
    status: ListeningDailySetStatus;
    targetItemCount: number;
    physicalItemCount: number;
    readyItemCount: number;
    completedItemCount: number;
    failureReason: string | null;
    items: ListeningItemSummary[];
}


export interface ListeningDailyModeStatus {
    learningMode: ListeningLearningMode;
    dailySetId: number | null;
    latestSessionId: number | null;
    status: ListeningDailySetStatus | null;
    latestSessionStatus: ListeningSessionStatus | null;
    completedItemCount: number;
    evaluatedItemCount: number;
    submittedItemCount: number;
    terminalItemCount: number;
    answerRevealedItemCount: number;
    physicalItemCount: number;
    readyItemCount: number;
    targetItemCount: number;
    completed: boolean;
}

export interface ListeningChoiceOption {
    key: string;
    text: string;
}

export interface ListeningSessionCreateRequest {
    dailySetId: number;
    selectedTaskTypes: ListeningTaskType[];
    idempotencyKey: string;
}

export interface ListeningAudioAvailability {
    available: boolean;
    expired: boolean;
    retentionUntil: string | null;
    deletedAt: string | null;
}

export interface ListeningEvaluation {
    evaluationId: number;
    taskType: ListeningTaskType;
    evaluable: boolean;
    score: number | null;
    confidence: number | null;
    reasonCode: string | null;
    metrics: Array<Record<string, unknown>>;
    strengths: string[];
    improvements: string[];
    recommendedAnswers: string[];
    evaluatedAt: string;
}

export interface ListeningTask {
    taskResponseId: number;
    taskType: ListeningTaskType;
    status: ListeningTaskStatus;
    answerText: string | null;
    audioUploaded: boolean;
    audioDurationMs: number | null;
    audioAvailability: ListeningAudioAvailability | null;
    rerecordCount: number;
    assistanceLevel: ListeningAssistanceLevel;
    assistanceUsage: ListeningAssistanceUsage[];
    evaluationErrorCode: string | null;
    evaluation: ListeningEvaluation | null;
}

export interface ListeningPlaybackSummary {
    normalPlaybackCount: number;
    slowPlaybackCount: number;
    policyVersion: string | null;
}

export interface ListeningPlaybackRequest {
    attemptId: number;
    playbackType: ListeningPlaybackType;
    clientEventId: string;
}

export interface ListeningAttempt {
    attemptId: number;
    itemId: number;
    attemptNo: number;
    evaluationPurpose: ListeningEvaluationPurpose;
    status: ListeningAttemptStatus;
    answerRevealed: boolean;
    contentOverallScore: number | null;
    listeningIndependenceScore: number | null;
    overallScore: number | null;
    playbackSummary: ListeningPlaybackSummary;
    evaluatedTaskCount: number;
    coverage: number;
    errorCode: string | null;
    tasks: ListeningTask[];
}

export interface ListeningActiveSession {
    active: boolean;
    session: ListeningSession | null;
}

export interface ListeningSession {
    sessionId: number;
    dailySetId: number;
    status: ListeningSessionStatus;
    selectedTaskTypes: ListeningTaskType[];
    completedItemCount: number;
    evaluatedItemCount: number;
    actualDurationMs: number;
    startedAt: string;
    lastActivityAt: string;
    resumableUntil: string;
    attempts: ListeningAttempt[];
}

export interface ListeningItem {
    sessionId: number;
    itemId: number;
    itemIndex: number;
    status: ListeningItemStatus;
    playable: boolean;
    referenceAudioPath: string | null;
    audioDurationMs: number | null;
    topicHint: string | null;
    keywordHints: string[];
    question: string | null;
    options: ListeningChoiceOption[];
    comprehensionFocus: "GIST" | "DETAIL" | "INTENT" | "INFERENCE" | "NEXT_ACTION" | null;
    correctOptionKey: string | null;
    summaryKeyPoints: string[];
    sourceText: string | null;
    referenceMeanings: string[] | null;
    attempt: ListeningAttempt;
}

export interface ListeningResponseUpsertRequest {
    answer: string;
    assistanceUsage: ListeningAssistanceUsage[];
    idempotencyKey: string;
}

export interface ListeningAudioUpload {
    taskResponseId: number;
    durationMs: number;
    rerecordCount: number;
    retentionUntil: string;
}

export interface ListeningSubmitRequest {
    idempotencyKey: string;
    actualDurationMs: number;
}

export interface ListeningRetryRequest {
    taskType: ListeningTaskType;
    idempotencyKey: string;
}

export interface ListeningPracticeAttemptRequest {
    idempotencyKey: string;
    selectedTaskTypes: ListeningTaskType[];
}

export interface ListeningSkipRequest {
    idempotencyKey: string;
    actualDurationMs: number;
}

export interface ListeningRevealAnswer {
    attemptId: number;
    sourceText: string;
    referenceMeanings: string[];
    excludedFromProgress: boolean;
    excludedFromProfile: boolean;
}

export type ListeningEvaluationReportReason =
    | "STT_INCORRECT"
    | "PRONUNCIATION_EVALUATION_INCORRECT"
    | "OTHER";

export interface ListeningEvaluationReportRequest {
    reasonCode: ListeningEvaluationReportReason;
    comment: string | null;
    consentToRetainAudio: boolean;
    idempotencyKey: string;
}

export interface ListeningEvaluationReport {
    reportId: number;
    taskResponseId: number;
    status: string;
    consentToRetainAudio: boolean;
    audioRetentionUntil: string | null;
}

export interface ListeningSessionResult {
    sessionId: number;
    status: ListeningSessionStatus;
    learnedItemCount: number;
    evaluatedItemCount: number;
    averageScore: number | null;
    coverage: number;
    attempts: ListeningAttempt[];
}

export interface ListeningPolicy {
    enabled: boolean;
    defaultItemCount: number;
    minItemCount: number;
    maxItemCount: number;
    hardItemLimit: number;
    resumeHours: number;
    referenceAudioRetentionDays: number;
    userAudioRetentionDays: number;
    reportedAudioRetentionDays: number;
    automaticRetryLimit: number;
    manualRetryLimit: number;
    practiceAttemptLimit: number;
    profilePolicyVersion: string;
    modelConfigVersion: string;
    referenceTtsRegenerationEnabled: boolean;
}

export interface ListeningHistoryAttemptDetail {
    itemId: number;
    itemIndex: number;
    sourceText: string;
    referenceMeanings: string[];
    referenceAudio: ListeningAudioAvailability;
    attempt: ListeningAttempt;
}

export interface ListeningHistoryDetail {
    session: ListeningSession;
    attempts: ListeningHistoryAttemptDetail[];
}

export const LISTENING_TASKS: ListeningTaskType[] = [
    "DICTATION",
    "INTERPRETATION",
    "REPEAT_AFTER_AUDIO",
    "COMPREHENSION",
    "SUMMARY",
];

export function isValidListeningTaskSelection(tasks: ListeningTaskType[]): boolean {
    const unique = new Set(tasks);
    if (unique.size !== tasks.length || unique.size === 0) return false;
    if (unique.size === 1 && (unique.has("COMPREHENSION") || unique.has("SUMMARY"))) return true;
    if (unique.has("COMPREHENSION") || unique.has("SUMMARY")) return false;
    if (unique.has("INTERPRETATION") && unique.size === 1) return false;
    return unique.has("DICTATION") || unique.has("REPEAT_AFTER_AUDIO");
}
