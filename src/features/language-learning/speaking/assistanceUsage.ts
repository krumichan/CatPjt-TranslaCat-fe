import type { AssistanceType } from "@/types/language-learning/speaking";

type TurnWithAssistance = { assistanceUsage?: readonly AssistanceType[] | null };

export const SPEAKING_ASSISTANCE_TYPES: readonly AssistanceType[] = [
    "REPLAY", "SLOW_PLAYBACK", "SHOW_QUESTION", "HINT", "TRANSLATION", "SAMPLE_ANSWER",
];
const NEUTRAL: readonly AssistanceType[] = ["REPLAY", "SLOW_PLAYBACK", "SHOW_QUESTION"];
const ASSISTED: readonly AssistanceType[] = ["HINT", "TRANSLATION"];
const GUIDED: readonly AssistanceType[] = ["SAMPLE_ANSWER"];

export function flattenSpeakingAssistanceUsage(turns: readonly TurnWithAssistance[]): AssistanceType[] {
    return turns.flatMap((turn) => turn.assistanceUsage ?? []);
}

export function countSpeakingAssistanceUsage(usage: readonly AssistanceType[], types: readonly AssistanceType[]): number {
    return usage.filter((type) => types.includes(type)).length;
}

export function summarizeSpeakingAssistanceUsage(turns: readonly TurnWithAssistance[]) {
    const usage = flattenSpeakingAssistanceUsage(turns);
    return {
        total: usage.length,
        neutral: countSpeakingAssistanceUsage(usage, NEUTRAL),
        assisted: countSpeakingAssistanceUsage(usage, ASSISTED),
        guided: countSpeakingAssistanceUsage(usage, GUIDED),
    };
}
