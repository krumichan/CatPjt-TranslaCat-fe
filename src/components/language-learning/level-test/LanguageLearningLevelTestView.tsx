"use client";

import { LevelTestCompletedCard } from "@/components/language-learning/level-test/LevelTestCompletedCard";
import { LevelTestQuestionCard } from "@/components/language-learning/level-test/LevelTestQuestionCard";
import { LevelTestReadyCard } from "@/components/language-learning/level-test/LevelTestReadyCard";
import { WritingEvaluationPanel } from "@/components/language-learning/writing/WritingEvaluationPanel";
import type { LanguageLearningLevelTestController } from "@/hooks/language-learning/useLanguageLearningLevelTestController";

interface LanguageLearningLevelTestViewProps {
    controller: LanguageLearningLevelTestController;
}

export function LanguageLearningLevelTestView({
    controller,
}: LanguageLearningLevelTestViewProps) {
    if (controller.lastResult?.completed) {
        return (
            <LevelTestCompletedCard
                baseLevelScore={controller.lastResult.baseLevelScore}
            />
        );
    }

    if (!controller.question) {
        return <LevelTestReadyCard controller={controller} />;
    }

    return (
        <div className="space-y-5">
            <LevelTestQuestionCard controller={controller} />

            {controller.lastResult && !controller.lastResult.completed && (
                <WritingEvaluationPanel
                    evaluation={controller.lastResult.evaluation}
                    compact
                />
            )}
        </div>
    );
}
