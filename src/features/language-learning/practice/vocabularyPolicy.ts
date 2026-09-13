import type { CurrentVocabularyMode } from "@/types/language-learning/practice";

export const CURRENT_VOCABULARY_MODE: CurrentVocabularyMode = "CONTEXTUAL_CHOICE";
export const VOCABULARY_DAILY_QUESTION_COUNT = 10;
export const VOCABULARY_DAILY_NEW_MAX = 8;
export const VOCABULARY_DAILY_REVIEW_MAX = 2;

export const CURRENT_VOCABULARY_SKILLS = [
    "MEANING",
    "COLLOCATION",
    "NUANCE",
    "REGISTER",
    "PRAGMATIC_FIT",
] as const;
