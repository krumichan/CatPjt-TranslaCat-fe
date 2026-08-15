import type {
    ConversationStartMode,
    CorrectionMode,
    SpeakingTopicCategory,
} from "@/types/language-learning/speaking";

export const SPEAKING_TOPIC_CATEGORIES: SpeakingTopicCategory[] = [
    "DAILY",
    "TRAVEL",
    "FOOD",
    "SHOPPING",
    "BUSINESS",
    "IT",
    "HOBBY",
    "GAME",
    "CULTURE",
    "FREE_TALK",
];

export const SPEAKING_START_MODES: ConversationStartMode[] = [
    "AI_FIRST",
    "USER_FIRST",
    "TOPIC_RECOMMENDED",
];

export const SPEAKING_CORRECTION_MODES: CorrectionMode[] = [
    "CONVERSATION",
    "COACHING",
];

export const SPEAKING_VOICE_OPTIONS = [
    { id: "Aoede", label: "Aoede" },
    { id: "Kore", label: "Kore" },
    { id: "Puck", label: "Puck" },
] as const;

export const SPEAKING_PLAYBACK_SPEED_OPTIONS = [
    { id: "SLOW", rate: 0.8 },
    { id: "NORMAL", rate: 1 },
] as const;

export const SPEAKING_MIN_VALID_AUDIO_SECONDS = 1;
export const SPEAKING_MAX_TURN_AUDIO_SECONDS = 60;
export const SPEAKING_MAX_AUDIO_FILE_BYTES = 10 * 1024 * 1024;

export const SPEAKING_EVALUATION_MIN_TURNS = 5;
export const SPEAKING_EVALUATION_MIN_SECONDS = 60;
export const SPEAKING_EVALUATION_MIN_STT_RATIO = 80;
