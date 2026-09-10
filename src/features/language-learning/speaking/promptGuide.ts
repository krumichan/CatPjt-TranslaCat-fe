import type {
    SpeakingPromptGuide,
    SpeakingSessionDetail,
    SpeakingTurn,
} from "@/types/language-learning/speaking";

function emptyGuide(): SpeakingPromptGuide {
    return { scriptText: null, providedFacts: [], requiredIntents: [], responseConstraints: [] };
}

export function hasSpeakingPromptGuide(guide: SpeakingPromptGuide | null | undefined): boolean {
    return Boolean(guide?.scriptText?.trim())
        || (guide?.providedFacts?.length ?? 0) > 0
        || (guide?.requiredIntents?.length ?? 0) > 0
        || (guide?.responseConstraints?.length ?? 0) > 0;
}

export function selectReadAloudPromptTurn(detail: SpeakingSessionDetail, activeProblemIndex: number): SpeakingTurn | null {
    if (detail.session.practiceMode !== "READ_ALOUD" || activeProblemIndex <= 1) return null;
    return [...detail.turns].reverse().find((turn) =>
        turn.problemIndex === activeProblemIndex - 1 && Boolean(turn.assistantText?.trim()),
    ) ?? null;
}

export function resolveSpeakingPromptGuide(detail: SpeakingSessionDetail, promptTurn: SpeakingTurn | null): SpeakingPromptGuide {
    const { session, turns } = detail;
    if (session.practiceMode === "READ_ALOUD") {
        if (promptTurn) {
            return {
                ...emptyGuide(),
                ...promptTurn.promptGuide,
                scriptText: promptTurn.promptGuide?.scriptText?.trim()
                    ? promptTurn.promptGuide.scriptText : promptTurn.assistantText,
            };
        }
        return session.openingPromptGuide ?? { ...emptyGuide(), scriptText: session.openingAssistantText };
    }
    const latest = [...turns].reverse().find((turn) => hasSpeakingPromptGuide(turn.promptGuide));
    return latest?.promptGuide ?? session.openingPromptGuide ?? emptyGuide();
}
