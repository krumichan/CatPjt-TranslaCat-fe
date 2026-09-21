"use client";

import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { Link } from "@/navigation";
import { useTranslations } from "next-intl";

export function VocabularyRetirementNotice() {
    const t = useTranslations("LanguageLearning.vocabulary.retired");
    return (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 dark:border-white/10 dark:bg-slate-900/75" role="status">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("title")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t("description")}</p>
            <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/language-learning/reading" className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white">{t("readingAction")}</Link>
                <Link href="/language-learning/history" className="rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">{t("historyAction")}</Link>
            </div>
        </section>
    );
}

export function VocabularyRetirementPage() {
    const t = useTranslations("LanguageLearning.vocabulary.retired");
    return <LanguageLearningPageLayout title={t("title")} description={t("description")}><VocabularyRetirementNotice /></LanguageLearningPageLayout>;
}
