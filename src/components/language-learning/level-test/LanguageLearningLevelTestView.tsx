"use client";

import { LevelTestReadyCard } from "@/components/language-learning/level-test/LevelTestReadyCard";
import type { LanguageLearningLevelTestController } from "@/hooks/language-learning/useLanguageLearningLevelTestController";

interface LanguageLearningLevelTestViewProps {
    controller: LanguageLearningLevelTestController;
}

export function LanguageLearningLevelTestView({
    controller,
}: LanguageLearningLevelTestViewProps) {
    return <LevelTestReadyCard controller={controller} />;
}
