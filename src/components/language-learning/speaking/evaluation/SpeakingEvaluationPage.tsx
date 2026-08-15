"use client";

import { SpeakingEvaluationSmartPage } from "@/components/language-learning/speaking/evaluation/SpeakingEvaluationSmartPage";

export function SpeakingEvaluationPage({ sessionId }: { sessionId: number }) {
    return <SpeakingEvaluationSmartPage sessionId={sessionId} />;
}
