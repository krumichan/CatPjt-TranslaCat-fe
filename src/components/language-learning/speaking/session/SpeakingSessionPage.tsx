"use client";

import { SpeakingSessionSmartPage } from "@/components/language-learning/speaking/session/SpeakingSessionSmartPage";

export function SpeakingSessionPage({ sessionId }: { sessionId: number }) {
    return <SpeakingSessionSmartPage sessionId={sessionId} />;
}
