"use client";

import { AvailablePracticeModeLandingPage } from "@/components/language-learning/practice/AvailablePracticeModeLandingPage";
import { VocabularyRetirementPage } from "@/components/language-learning/practice/VocabularyRetirementPage";
import type { PracticeDomain } from "@/types/language-learning/practice";

export function PracticeModeLandingPage({ domain }: { domain: PracticeDomain }) {
    if (domain === "VOCABULARY") return <VocabularyRetirementPage />;
    return <AvailablePracticeModeLandingPage domain={domain} />;
}
