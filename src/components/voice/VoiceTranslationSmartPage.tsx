"use client";

import { VoiceTranslationView } from "@/components/voice/VoiceTranslationView";
import { useVoiceTranslationController } from "@/hooks/voice/useVoiceTranslationController";

export function VoiceTranslationSmartPage() {
    const controller = useVoiceTranslationController();
    return <VoiceTranslationView controller={controller} />;
}
