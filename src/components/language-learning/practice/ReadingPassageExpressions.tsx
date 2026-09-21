"use client";

import { readingPassageExpressions } from "@/features/language-learning/practice/readingPassageExpressions";
import type { PracticeSet } from "@/types/language-learning/practice";
import { useTranslations } from "next-intl";

export function ReadingPassageExpressions({ set, passageId }: { set: PracticeSet; passageId?: string | null }) {
    const t = useTranslations("LanguageLearning.reading");
    const expressions = readingPassageExpressions(set, passageId);
    if (!expressions.length) return null;
    return (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 dark:border-white/10 dark:bg-slate-900/75">
            <h3 className="font-black text-slate-900 dark:text-white">{t("session.vocabularyCandidates")}</h3>
            <ul className="mt-4 space-y-4">
                {expressions.map((item) => (
                    <li key={`${item.passageId}:${item.expression}`}>
                        <p className="font-bold text-blue-700 dark:text-blue-200">{item.expression}</p>
                        <p className="mt-1 text-xs text-slate-500">{t("session.passage")} · {item.passageId}</p>
                        {item.sourceQuotes.map((quote, quoteIndex) => (
                            <blockquote key={quoteIndex} className="mt-2 whitespace-pre-wrap border-l-2 border-blue-200 pl-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                                {quote.split(item.expression).map((part, index) => (
                                    <span key={index}>{index > 0 && <mark className="bg-blue-100 text-inherit dark:bg-blue-900">{item.expression}</mark>}{part}</span>
                                ))}
                            </blockquote>
                        ))}
                    </li>
                ))}
            </ul>
        </section>
    );
}
