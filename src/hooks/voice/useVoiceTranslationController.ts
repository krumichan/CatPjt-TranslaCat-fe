"use client";

import { useVoiceHistory } from "@/hooks/voice/useVoiceHistory";
import { useVoiceLiveSession } from "@/hooks/voice/useVoiceLiveSession";

export function useVoiceTranslationController() {
    const history = useVoiceHistory();
    const live = useVoiceLiveSession({ onCompleted: history.reload });

    return { live, history };
}

export type VoiceTranslationController = ReturnType<
    typeof useVoiceTranslationController
>;
