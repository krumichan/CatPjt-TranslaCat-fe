"use client";

import { isGenerationPending } from "@/features/language-learning/generationState";
import {
    canSubmitPracticeAnswer,
    firstWorkingIndex,
    getPracticeCurrentAnswer,
    getPracticeSelectionContext,
    isPracticeComplete,
    resolvePracticeSelection,
    type PracticeSelection,
} from "@/features/language-learning/practice/practiceSessionState";
import { readingVocabularyService } from "@/services/language-learning/readingVocabularyService";
import type { PracticeDomain, PracticeSet } from "@/types/language-learning/practice";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Owns request lifecycle, polling, answer editing and submission; exposes no refs to the view. */
export function usePracticeSessionController({ setId, expectedDomain }: { setId: number; expectedDomain: PracticeDomain }) {
    const [set, setSet] = useState<PracticeSet | null>(null);
    const [index, setIndex] = useState(0);
    const [selection, setSelection] = useState<PracticeSelection | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(false);
    const [reviewMode, setReviewMode] = useState(false);
    const [retryingGeneration, setRetryingGeneration] = useState(false);
    // Invalidate reads started before a submit/retry so stale polls cannot undo it.
    const readEpoch = useRef(0);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; readEpoch.current += 1; };
    }, []);

    const load = useCallback(async () => {
        const epoch = ++readEpoch.current;
        setLoading(true);
        setError(false);
        try {
            const next = await readingVocabularyService.getSet(setId);
            if (next.domain !== expectedDomain) throw new Error("domain mismatch");
            if (!mounted.current || epoch !== readEpoch.current) return;
            setSet(next);
            setIndex(firstWorkingIndex(next));
        } catch {
            if (mounted.current && epoch === readEpoch.current) setError(true);
        } finally {
            if (mounted.current && epoch === readEpoch.current) setLoading(false);
        }
    }, [expectedDomain, setId]);

    useEffect(() => { void load(); }, [load]);

    const generating = isGenerationPending(set?.generationStatus);
    const generationFailure = set?.generationFailureMessage
        || (set?.generationStatus === "PARTIAL" || set?.generationStatus === "FAILED" ? "GENERATION_FAILED" : null);

    useEffect(() => {
        if (!generating || submitting || retryingGeneration) return;
        let cancelled = false;
        let timer: number;
        const poll = async () => {
            const epoch = readEpoch.current;
            try {
                const next = await readingVocabularyService.getSet(setId);
                if (!cancelled && mounted.current && epoch === readEpoch.current && next.domain === expectedDomain) {
                    // Keep the current question/selection: only append server state.
                    setSet(next);
                }
            } catch {
                // A transient read failure does not discard usable questions or stop polling.
            } finally {
                if (!cancelled) timer = window.setTimeout(poll, 1500);
            }
        };
        timer = window.setTimeout(poll, 1500);
        return () => { cancelled = true; window.clearTimeout(timer); };
    }, [expectedDomain, generating, retryingGeneration, setId, submitting]);

    const retryGeneration = async () => {
        if (retryingGeneration || submitting) return;
        const epoch = ++readEpoch.current;
        const isCurrent = () => mounted.current && epoch === readEpoch.current;
        setRetryingGeneration(true);
        setError(false);
        try {
            const next = await readingVocabularyService.retryGeneration(setId);
            if (next.domain !== expectedDomain) throw new Error("domain mismatch");
            if (isCurrent()) setSet(next);
        } catch {
            if (isCurrent()) setError(true);
        } finally {
            if (isCurrent()) setRetryingGeneration(false);
        }
    };

    const question = set?.questions[index] ?? null;
    const currentAnswer = useMemo(() => getPracticeCurrentAnswer(question), [question]);

    // Snapshot the semantic question/attempt identity, not the response array's
    // reference: appending generated questions must preserve an in-progress choice.
    const selectionContext = getPracticeSelectionContext(setId, question);
    const initialSelection = question?.canRetry ? currentAnswer : [];
    const selected = resolvePracticeSelection(selection, selectionContext, initialSelection);
    const setSelected = (update: string[] | ((current: string[]) => string[])) => {
        setSelection((current) => {
            const answer = resolvePracticeSelection(current, selectionContext, initialSelection);
            return {
                context: selectionContext,
                answer: typeof update === "function" ? update(answer) : update,
            };
        });
    };

    const answerForSubmit = selected.length > 0 ? selected : currentAnswer;
    const canSubmit = canSubmitPracticeAnswer(question, answerForSubmit, submitting);

    const submit = async () => {
        if (!question || !canSubmit) return;
        const epoch = ++readEpoch.current;
        const isCurrent = () => mounted.current && epoch === readEpoch.current;
        setSubmitting(true);
        setError(false);
        try {
            await readingVocabularyService.submitAnswer(question.questionId, answerForSubmit);
            const refreshed = await readingVocabularyService.getSet(setId);
            if (!isCurrent()) return;
            if (refreshed.domain !== expectedDomain) throw new Error("domain mismatch");
            setSet(refreshed);
            const refreshedQuestion = refreshed.questions.find((item) => item.questionId === question.questionId);
            const refreshedIndex = refreshed.questions.findIndex((item) => item.questionId === question.questionId);
            if (refreshedIndex >= 0) setIndex(refreshedIndex);
            if (refreshedQuestion?.correct) setSelected([]);
        } catch {
            if (isCurrent()) setError(true);
        } finally {
            if (isCurrent()) setSubmitting(false);
        }
    };

    const next = () => {
        if (!set) return;
        const nextUnanswered = set.questions.findIndex((item, idx) => idx > index && !item.answered);
        if (nextUnanswered >= 0) {
            setIndex(nextUnanswered);
            return;
        }
        if (index < set.questions.length - 1) setIndex(index + 1);
    };

    const moveChunk = (key: string) => {
        if (!question || question.answered && !question.canRetry) return;
        setSelected((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key]);
    };

    const setSingleChoice = (key: string) => {
        if (!question || question.answered && !question.canRetry) return;
        setSelected([key]);
    };

    return {
        set, index, setIndex, question, selected, setSelected,
        loading, submitting, error, reviewMode, setReviewMode,
        retryingGeneration, generating, generationFailure,
        load, retryGeneration, canSubmit, submit, next, moveChunk, setSingleChoice,
        completed: isPracticeComplete(set),
    };
}
