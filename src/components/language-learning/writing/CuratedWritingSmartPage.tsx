"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { createCuratedWritingService } from "@/services/language-learning/curatedWritingService";
import type { DailyWritingType } from "@/types/language-learning/common";
import type { CuratedWritingSet } from "@/types/language-learning/curatedWriting";

const types: DailyWritingType[] = ["TRANSLATION", "GUIDED", "FREE"];

export function CuratedWritingSmartPage() {
    const t = useTranslations("LanguageLearning.writing.curated");
    const { data: session, status } = useSession();
    const owner = session?.user?.publicId;
    const loginSessionId = session?.loginSessionId;
    return <LanguageLearningPageLayout guideTopic="language-learning/writing" title={t("title")} description={t("description")}>
        {status === "loading" ? <p role="status">{t("loading")}</p> : owner && loginSessionId ?
            <CuratedWritingWorkspace key={`${owner}:${loginSessionId}`} loginSessionId={loginSessionId} /> :
            <p role="alert">{t("signedOut")}</p>}
    </LanguageLearningPageLayout>;
}

function CuratedWritingWorkspace({ loginSessionId }: { loginSessionId: string }) {
    const t = useTranslations("LanguageLearning.writing.curated");
    const writing = useTranslations("LanguageLearning.writing");
    const curatedWritingService = useMemo(() => createCuratedWritingService(loginSessionId), [loginSessionId]);
    const [type, setType] = useState<DailyWritingType>("TRANSLATION");
    const [dailySet, setDailySet] = useState<CuratedWritingSet | null>(null);
    const [drafts, setDrafts] = useState<Record<number, string>>({});
    const [historyDate, setHistoryDate] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);

    async function run(operation: () => Promise<CuratedWritingSet>) {
        setBusy(true);
        setError(false);
        try {
            const result = await operation();
            setDailySet(result);
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    }

    function chooseType(next: DailyWritingType) {
        setType(next);
        setDailySet(null);
        setDrafts({});
        setError(false);
    }

    return (
            <div className="space-y-5" data-testid="curated-writing-page">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
                    {t("qaNotice")}
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label={t("typeLabel")}>
                    {types.map((option) => (
                        <button key={option} type="button" disabled={busy} onClick={() => chooseType(option)}
                            aria-pressed={type === option}
                            className={`rounded-xl px-4 py-2 text-sm font-bold ${type === option ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-700 dark:border-white/20 dark:bg-slate-900 dark:text-slate-100"}`}>
                            {writing(`types.${option}`)}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button type="button" disabled={busy} onClick={() => void run(() => curatedWritingService.start(type))}
                        className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50">
                        {t("openToday")}
                    </button>
                    <button type="button" disabled={busy} onClick={() => void run(() => curatedWritingService.start(type, true))}
                        className="rounded-xl border border-slate-300 px-4 py-2 font-bold disabled:opacity-50 dark:border-white/20">
                        {t("rePractice")}
                    </button>
                    <label className="text-sm font-bold">
                        {t("historyDate")}
                        <input type="date" value={historyDate} onChange={(event) => setHistoryDate(event.target.value)}
                            className="ml-2 rounded-lg border border-slate-300 p-2 text-slate-900" />
                    </label>
                    <button type="button" disabled={busy || !historyDate}
                        onClick={() => void run(() => curatedWritingService.history(historyDate, type))}
                        className="rounded-xl border border-slate-300 px-4 py-2 font-bold disabled:opacity-50 dark:border-white/20">
                        {t("openHistory")}
                    </button>
                </div>
                {busy && <p role="status">{t("loading")}</p>}
                {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{t("requestFailed")}</p>}
                {dailySet && (
                    <div className="space-y-4" data-testid="curated-writing-set">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
                            <p className="font-bold">{dailySet.learningDate} · {writing(`types.${dailySet.writingType}`)} · {dailySet.items.filter((item) => item.answered).length}/5</p>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t("referenceOnly")}</p>
                            <p className="mt-1 text-xs text-slate-500">{t("feedbackDisabled")}</p>
                            {dailySet.status === "READY" && dailySet.replacementCount < 1 && (
                                <button type="button" disabled={busy || dailySet.items.every((item) => item.answered)}
                                    onClick={() => void run(() => curatedWritingService.replace(dailySet.dailySetId))}
                                    className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold disabled:opacity-50 dark:border-white/20">
                                    {t("replaceUnanswered")}
                                </button>
                            )}
                        </div>
                        {dailySet.items.map((item) => (
                            <article key={`${item.itemId}-${item.contentRevision}`} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900"
                                data-testid={`curated-writing-item-${item.order}`}>
                                <p className="text-xs font-bold text-blue-700 dark:text-blue-300">#{item.order} · {writing(`item.difficulty.${item.difficulty}`)} · B{item.targetBand}</p>
                                <p className="mt-3 text-base font-semibold">{item.originText}</p>
                                {item.providedFacts.length > 0 && <div className="mt-3"><p className="text-sm font-bold">{t("facts")}</p><ul className="list-disc pl-5 text-sm">{item.providedFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul></div>}
                                {item.requiredIntents.length > 0 && <div className="mt-3"><p className="text-sm font-bold">{t("intents")}</p><ul className="list-disc pl-5 text-sm">{item.requiredIntents.map((intent) => <li key={intent}>{intent}</li>)}</ul></div>}
                                {item.responseConstraints.length > 0 && <div className="mt-3"><p className="text-sm font-bold">{t("constraints")}</p><ul className="list-disc pl-5 text-sm">{item.responseConstraints.map((constraint) => <li key={constraint}>{constraint}</li>)}</ul></div>}
                                {item.canSubmit && <div className="mt-4">
                                    <label className="block text-sm font-bold" htmlFor={`curated-answer-${item.itemId}`}>{t("answer")}</label>
                                    <textarea id={`curated-answer-${item.itemId}`} value={drafts[item.itemId] ?? ""}
                                        onChange={(event) => setDrafts((previous) => ({ ...previous, [item.itemId]: event.target.value }))}
                                        maxLength={3000} rows={4} disabled={busy}
                                        className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-slate-900 dark:border-white/20 dark:bg-slate-800 dark:text-white" />
                                    <button type="button" disabled={busy || !(drafts[item.itemId] ?? "").trim()}
                                        onClick={() => void run(() => curatedWritingService.submit(item.itemId, drafts[item.itemId], item.contentRevision))}
                                        className="mt-2 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50">{t("saveAnswer")}</button>
                                </div>}
                                {item.attempts.map((attempt) => <div key={attempt.answerId} className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
                                    <p className="font-bold">{t("savedAnswer")} · {attempt.attemptDate}</p><p className="mt-1 whitespace-pre-wrap">{attempt.answer}</p>
                                </div>)}
                                {item.reference && <section className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950/30">
                                    <p className="font-bold">{t("referenceTitle")}</p>
                                    <p className="mt-1">{t("multipleAnswers")}</p>
                                    <ul className="mt-2 list-disc pl-5">{item.reference.checklist.map((check) => <li key={check}>{check}</li>)}</ul>
                                    {item.reference.referenceAnswers.map((reference) => <p key={reference} className="mt-2 whitespace-pre-wrap">{reference}</p>)}
                                    <p className="mt-2">{item.reference.alternativeNote}</p>
                                </section>}
                            </article>
                        ))}
                    </div>
                )}
            </div>
    );
}
