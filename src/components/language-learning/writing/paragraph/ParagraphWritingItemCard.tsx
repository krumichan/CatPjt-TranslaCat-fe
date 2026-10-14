"use client";

import { useTranslations } from "next-intl";
import type { ParagraphWritingItem } from "@/types/language-learning/paragraphWriting";
import { ParagraphWritingReference } from "./ParagraphWritingReference";

interface Props {
    item: ParagraphWritingItem;
    draft: string;
    maxLength: number;
    busy: boolean;
    showWorkload: boolean;
    onDraft: (answer: string) => void;
    onSubmit: () => void;
    onRetryFeedback: (answerId: number) => void;
    onPreparation?: () => void;
}

export function ParagraphWritingItemCard({ item, draft, maxLength, busy, showWorkload, onDraft, onSubmit, onRetryFeedback, onPreparation }: Props) {
    const t = useTranslations("ParagraphWriting");
    const groups = [["facts", item.providedFacts], ["intents", item.requiredIntents], ["constraints", item.responseConstraints], ["taskRequirements", item.taskRequirements ?? []]] as const;

    return (
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-slate-900" data-testid={`paragraph-item-${item.order}`}>
            <h2 className="text-sm font-bold text-blue-700 dark:text-blue-300">{t("item", { order: item.order })} · {t(`difficulty.${item.difficulty}`)} · B{item.targetBand}</h2>
            <p className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed" data-testid="paragraph-source">{item.originText}</p>
            {onPreparation && <div className="mt-3 text-sm">
                <p>{t("generatedQualityNotice")}</p>
                <button type="button" disabled={busy} className="mt-2 rounded border p-2" onClick={onPreparation}>{t("openPreparation")}</button>
            </div>}
            {groups.map(([label, lines]) => lines.length > 0 && <div key={label} className="mt-3">
                <h3 className="text-sm font-bold">{t(label)}</h3>
                <ul className="list-disc pl-5 text-sm">{lines.map((line, index) => <li key={index} className="whitespace-pre-wrap break-words">{line}</li>)}</ul>
            </div>)}
            {showWorkload && <div className="mt-3 text-sm">
                <p>{t("sourceLength", { count: item.workload.sourceCharacterCount })}</p>
                <p>{t("answerEstimateUnknown")}</p>
            </div>}
            {item.canSubmit && <div className="mt-4">
                <label htmlFor={`paragraph-answer-${item.itemId}`} className="block text-sm font-bold">{t("answer")}</label>
                <textarea id={`paragraph-answer-${item.itemId}`} value={draft} onChange={(event) => onDraft(event.target.value)}
                    rows={8} maxLength={maxLength} disabled={busy} aria-describedby={`paragraph-answer-length-${item.itemId}`}
                    className="mt-2 w-full min-w-0 resize-y rounded-xl border border-slate-300 bg-transparent p-3 leading-relaxed dark:border-white/20" />
                <p id={`paragraph-answer-length-${item.itemId}`} className="text-sm">{t("answerLength", { count: draft.length, max: maxLength })}</p>
                <button type="button" disabled={busy || !draft.trim() || draft.length > maxLength} onClick={onSubmit}
                    className="mt-2 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50">{t("submit")}</button>
            </div>}
            {item.attempts.map((attempt) => <section key={attempt.answerId} className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5" aria-label={t("savedAnswer")}>
                <h3 className="font-bold">{t("savedAnswer")} · {attempt.attemptDate}</h3>
                <p className="mt-1 whitespace-pre-wrap break-words">{attempt.answer}</p>
                {attempt.feedback && <div className="mt-3 space-y-2" data-testid={`paragraph-feedback-${attempt.answerId}`}>
                    <h4 className="font-semibold">{t("feedbackTitle")} · {t(`feedbackStates.${attempt.feedback.status}`)}</h4>
                    {attempt.feedback.result && <>
                        <p>{t("feedbackReferenceOnly")}</p>
                        <ul className="space-y-2">{attempt.feedback.result.observations.map((row) => <li key={row.requirementId}>
                            <strong>{row.requirementId} · {t(`requirementStates.${row.status}`)}</strong>
                            {row.evidenceKind === "MISSING_REQUIREMENT" && <p>{t("missingRequirementEvidence")}</p>}
                            <p>{row.originText}</p><p lang="ja">{row.learningText}</p>
                            {["curated-writing-feedback-v6", "curated-writing-feedback-v7", "curated-writing-feedback-v8", "curated-writing-feedback-v9", "curated-writing-feedback-v10", "curated-writing-feedback-v11", "curated-writing-feedback-v12"].includes(attempt.feedback?.result?.policyVersion ?? "") ? row.requirementParts?.map((part, index) => <div
                                key={index} data-testid={`paragraph-part-${row.requirementId}-${index + 1}`}
                                className="mt-2 rounded-lg border border-slate-200 p-2 dark:border-white/10">
                                <p className="font-medium" data-testid="paragraph-part-status">{t(`requirementPartStates.${part.status}`)}</p>
                                <p className="whitespace-pre-wrap" data-testid="paragraph-part-requirement">{part.requirementQuote}</p>
                                {part.status === "ABSENT" ? <p data-testid="paragraph-part-missing">{t("missingRequirementPart")}</p> : <>
                                    <p className="mt-1 text-xs">{t("requirementPartEvidence")}</p>
                                    {part.evidence.map((evidence, evidenceIndex) => <blockquote key={evidenceIndex} lang="ja"
                                        className="whitespace-pre-wrap border-l-2 pl-2">{evidence.quote}</blockquote>)}
                                </>}
                            </div>) : row.answerQuotes.map((quote, index) => <blockquote key={index} lang="ja" className="whitespace-pre-wrap border-l-2 pl-2">{quote}</blockquote>)}
                        </li>)}</ul>
                        {attempt.feedback.result.necessaryCorrections.map((row, index) => <div key={`correction-${index}`}>
                            <strong>{t("necessaryCorrection")} · {row.requirementId}</strong>
                            {row.issueType && <p>{t(`correctionBasis.${row.issueType}`)}</p>}
                            <p lang="ja" className="whitespace-pre-wrap">{row.original} → {row.replacement}</p>
                            <p>{row.originText}</p><p lang="ja">{row.learningText}</p>
                        </div>)}
                        {attempt.feedback.result.optionalAlternatives.map((row, index) => <div key={`optional-${index}`}>
                            <strong>{t("optionalAlternative")}</strong>
                            {row.suggestionKind === "HYPOTHETICAL_EXAMPLE" ? <>
                                <p className="font-medium">{t("hypotheticalExample")}</p>
                                <p lang="ja" className="whitespace-pre-wrap">{row.replacement}</p>
                            </> : <p lang="ja" className="whitespace-pre-wrap">{row.original} → {row.replacement}</p>}
                            <p>{row.originText}</p><p lang="ja">{row.learningText}</p>
                        </div>)}
                        {attempt.feedback.result.uncertainties.map((row, index) => <p key={`uncertain-${index}`}>{t("uncertainty")} · {row.requirementId}: {row.originText}</p>)}
                    </>}
                    {attempt.feedback.failureCode && <p role="status">{t("feedbackFailure")}: {attempt.feedback.failureCode}</p>}
                    {attempt.feedback.canRetry && <button type="button" disabled={busy} onClick={() => onRetryFeedback(attempt.answerId)}
                        className="rounded-lg border px-3 py-2 disabled:opacity-50">{t("retryFeedback")}</button>}
                </div>}
            </section>)}
            {item.answered && item.reference && <ParagraphWritingReference reference={item.reference} />}
        </article>
    );
}
