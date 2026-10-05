"use client";

import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { VocabularyRetirementNotice } from "@/components/language-learning/practice/VocabularyRetirementNotice";
import { useTranslations } from "next-intl";

export function VocabularyRetirementPage() {
    const t = useTranslations("LanguageLearning.vocabulary.retired");
    return <LanguageLearningPageLayout title={t("title")} description={t("description")}><VocabularyRetirementNotice /></LanguageLearningPageLayout>;
}
