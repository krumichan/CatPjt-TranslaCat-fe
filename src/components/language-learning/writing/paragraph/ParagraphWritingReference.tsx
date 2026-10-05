"use client";

import { useTranslations } from "next-intl";
import type { CuratedWritingReference } from "@/types/language-learning/curatedWriting";

export function ParagraphWritingReference({ reference }: { reference: CuratedWritingReference }) {
    const t = useTranslations("ParagraphWriting");

    return (
        <section className="mt-4 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950/30" aria-label={t("reference")}>
            <h3 className="font-bold">{t("reference")}</h3>
            <p>{t("multipleAnswers")}</p>
            <ul className="list-disc pl-5">{reference.checklist.map((check, index) => <li key={index} className="whitespace-pre-wrap break-words">{check}</li>)}</ul>
            {reference.referenceAnswers.map((answer, index) => <p key={index} className="whitespace-pre-wrap break-words">{answer}</p>)}
            <p className="whitespace-pre-wrap break-words">{reference.alternativeNote}</p>
        </section>
    );
}
