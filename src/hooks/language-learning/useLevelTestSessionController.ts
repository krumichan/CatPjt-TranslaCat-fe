"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createIdempotencyKey } from "@/features/language-learning/listening/idempotency";
import { useAudioRecorder } from "@/hooks/language-learning/speaking/useAudioRecorder";
import { useMicrophonePermission } from "@/hooks/language-learning/speaking/useMicrophonePermission";
import { LANGUAGE_LEARNING_ERROR_CODES } from "@/hooks/language-learning/languageLearningErrorMapper";
import { useLanguageLearningEntryState } from "@/hooks/language-learning/useLanguageLearningEntryState";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/navigation";
import { getApiErrorCode } from "@/services/common/responseParser";
import { languageLearningLevelService } from "@/services/language-learning/languageLearningLevelService";
import type {
    LevelTestAnswerResult,
    LevelTestQuestion,
} from "@/types/language-learning/level";

const RERECORD_REQUIRED_REASON_CODES = new Set([
    "INVALID_AUDIO",
    "SILENCE_DETECTED",
    "UNSUPPORTED_AUDIO_FORMAT",
    "AUDIO_TOO_SHORT",
    "AUDIO_TOO_LONG",
    "LOW_STT_CONFIDENCE",
]);

export function useLevelTestSessionController(sessionId: number) {
    const router = useRouter();
    const entry = useLanguageLearningEntryState();
    const [sessionValidated, setSessionValidated] = useState(false);
    const [questionValidated, setQuestionValidated] = useState(false);
    const sessionQuery = useQuery({
        keys: ["language-learning-level-session", sessionId] as const,
        fetcher: (_key, id) => languageLearningLevelService.getSession(id),
        enabled: Number.isFinite(sessionId) && sessionId > 0,
        config: {
            revalidateOnMount: true,
            onSuccess: () => setSessionValidated(true),
            onError: () => setSessionValidated(false),
        },
    });
    const questionQuery = useQuery({
        keys: ["language-learning-level-current", sessionId] as const,
        fetcher: (_key, id) => languageLearningLevelService.getCurrent(id),
        enabled:
            Number.isFinite(sessionId) &&
            sessionId > 0 &&
            sessionValidated &&
            sessionQuery.data?.status !== "COMPLETED",
        config: {
            revalidateOnMount: true,
            onSuccess: () => setQuestionValidated(true),
            onError: () => setQuestionValidated(false),
        },
    });

    const session = sessionValidated ? (sessionQuery.data ?? null) : null;
    const cachedQuestion = questionQuery.data ?? null;
    const questionIsCurrent =
        cachedQuestion != null &&
        session != null &&
        cachedQuestion.sessionId === sessionId &&
        session.sessionId === sessionId &&
        cachedQuestion.questionNumber === session.currentQuestionNumber;
    const question =
        questionValidated && questionIsCurrent ? cachedQuestion : null;
    const [selectedOptionKey, setSelectedOptionKey] = useState<string | null>(null);
    const [selectedOptionKeys, setSelectedOptionKeys] = useState<string[]>([]);
    const [textAnswer, setTextAnswer] = useState("");
    const [lastResult, setLastResult] = useState<LevelTestAnswerResult | null>(null);
    const [actionErrorCode, setActionErrorCode] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [rerecordRequested, setRerecordRequested] = useState(false);
    const [referenceAudioUrl, setReferenceAudioUrl] = useState<string | null>(null);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [referencePlaybackCount, setReferencePlaybackCount] = useState(0);
    const headingRef = useRef<HTMLHeadingElement | null>(null);
    const submissionAttemptRef = useRef<{
        itemId: number;
        idempotencyKey: string;
    } | null>(null);
    const submitInFlightRef = useRef(false);
    const retryInFlightRef = useRef(false);

    const recorder = useAudioRecorder({
        maxSeconds: question?.maxAudioSeconds ?? 30,
        navigationConfirmMessage: "Recording is in progress.",
    });
    const microphone = useMicrophonePermission();
    const resetRecorder = recorder.reset;

    useEffect(() => {
        setSessionValidated(false);
        setQuestionValidated(false);
        submissionAttemptRef.current = null;
        submitInFlightRef.current = false;
        retryInFlightRef.current = false;
    }, [sessionId]);

    useEffect(() => {
        const attempt = submissionAttemptRef.current;
        if (question?.itemId != null && attempt && attempt.itemId !== question.itemId) {
            submissionAttemptRef.current = null;
        }
    }, [question?.itemId]);

    useEffect(() => {
        setSelectedOptionKey(null);
        setSelectedOptionKeys([]);
        setTextAnswer("");
        setLastResult(null);
        setActionErrorCode(null);
        setRerecordRequested(false);
        setReferencePlaybackCount(0);
        resetRecorder();
        setReferenceAudioUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return null;
        });
        window.setTimeout(() => headingRef.current?.focus(), 0);
    }, [question?.itemId, resetRecorder]);

    useEffect(() => {
        if (
            question?.status !== "EVALUATING" &&
            sessionQuery.data?.status !== "EVALUATING"
        ) {
            return;
        }
        const timer = window.setInterval(async () => {
            await Promise.all([
                sessionQuery.mutate((current) => current, true),
                questionQuery.mutate((current) => current, true),
            ]);
        }, 2000);
        return () => window.clearInterval(timer);
    }, [question?.status, questionQuery, sessionQuery]);

    useEffect(() => {
        if (sessionQuery.data?.status !== "COMPLETED") return;
        router.replace(`/language-learning/level-test/result/${sessionId}`);
    }, [router, sessionId, sessionQuery.data?.status]);

    useEffect(
        () => () => {
            if (referenceAudioUrl) URL.revokeObjectURL(referenceAudioUrl);
        },
        [referenceAudioUrl],
    );

    const recoverCurrentQuestion = useCallback(async () => {
        setActionErrorCode(null);
        setSessionValidated(false);
        setQuestionValidated(false);
        const refreshedSession = await sessionQuery.mutate(
            (current) => current,
            true,
        );
        setSessionValidated(refreshedSession != null);
        if (!refreshedSession || refreshedSession.status === "COMPLETED") return;
        const refreshedQuestion = await questionQuery.mutate(
            (current) => current,
            true,
        );
        setQuestionValidated(refreshedQuestion != null);
    }, [questionQuery, sessionQuery]);

    const isRecoverableStaleItemError = useCallback((code: string | null) => {
        return (
            code === LANGUAGE_LEARNING_ERROR_CODES.LEVEL_TEST_NOT_FOUND ||
            code === LANGUAGE_LEARNING_ERROR_CODES.LEVEL_TEST_INVALID_STATE
        );
    }, []);

    const isSentenceOrder = question?.itemType === "GRAMMAR_SENTENCE_ORDER";
    const evaluationReasonCode =
        lastResult?.reasonCode ?? question?.evaluationReasonCode ?? null;
    const requiresRerecord =
        question?.answerMode === "AUDIO" &&
        question.status === "EVALUATION_FAILED" &&
        evaluationReasonCode != null &&
        RERECORD_REQUIRED_REASON_CODES.has(evaluationReasonCode);

    const canSubmit = useMemo(() => {
        if (!question || !session || isSubmitting || isRetrying) return false;
        if (session.status !== "IN_PROGRESS") return false;
        if (question.status === "EVALUATION_FAILED") {
            return (
                question.answerMode === "AUDIO" &&
                requiresRerecord &&
                rerecordRequested &&
                recorder.hasRecording
            );
        }
        if (question.status !== "READY") return false;
        if (question.answerMode === "AUDIO") return recorder.hasRecording;
        if (question.answerMode === "TEXT") return textAnswer.trim().length > 0;
        if (isSentenceOrder) {
            return (
                selectedOptionKeys.length === question.options.length &&
                selectedOptionKeys.length > 0
            );
        }
        return selectedOptionKey !== null;
    }, [
        isRetrying,
        isSentenceOrder,
        isSubmitting,
        question,
        recorder.hasRecording,
        rerecordRequested,
        requiresRerecord,
        session,
        selectedOptionKey,
        selectedOptionKeys.length,
        textAnswer,
    ]);

    const applyResult = useCallback(
        async (result: LevelTestAnswerResult) => {
            setLastResult(result);
            if (result.completed) {
                router.push(`/language-learning/level-test/result/${sessionId}`);
                return true;
            }

            setSessionValidated(false);
            setQuestionValidated(false);
            try {
                const refreshedSession = await sessionQuery.mutate(
                    (current) => current,
                    true,
                );
                setSessionValidated(refreshedSession != null);
                if (!refreshedSession) {
                    throw new Error("Level Test session refresh returned no data.");
                }
                if (refreshedSession.status === "COMPLETED") {
                    router.push(`/language-learning/level-test/result/${sessionId}`);
                    return true;
                }

                const canUseEmbeddedNextQuestion =
                    result.nextQuestion != null &&
                    result.nextQuestion.sessionId === refreshedSession.sessionId &&
                    result.nextQuestion.questionNumber ===
                        refreshedSession.currentQuestionNumber;
                const refreshedQuestion = canUseEmbeddedNextQuestion
                    ? await questionQuery.mutate(result.nextQuestion!, false)
                    : await questionQuery.mutate((current) => current, true);
                setQuestionValidated(refreshedQuestion != null);
                if (!refreshedQuestion) {
                    throw new Error("Level Test question refresh returned no data.");
                }
                return true;
            } catch (error) {
                console.error(
                    "Level Test answer was accepted, but the next question refresh failed.",
                    error,
                );
                setActionErrorCode(
                    getApiErrorCode(error) ?? "LEVEL_TEST_NEXT_QUESTION_REFRESH_FAILED",
                );
                return false;
            }
        },
        [questionQuery, router, sessionId, sessionQuery],
    );

    const submit = useCallback(async () => {
        if (!question || !canSubmit || submitInFlightRef.current) return false;
        submitInFlightRef.current = true;
        setIsSubmitting(true);
        setActionErrorCode(null);
        try {
            let attempt = submissionAttemptRef.current;
            if (!attempt || attempt.itemId !== question.itemId) {
                attempt = {
                    itemId: question.itemId,
                    idempotencyKey: createIdempotencyKey("level-test-answer"),
                };
                submissionAttemptRef.current = attempt;
            }

            const result =
                question.answerMode === "AUDIO"
                    ? await languageLearningLevelService.submitAudio(
                          sessionId,
                          question.itemId,
                          recorder.audioBlob!,
                          recorder.elapsedSeconds * 1000,
                          attempt.idempotencyKey,
                      )
                    : await languageLearningLevelService.submitAnswer(
                          sessionId,
                          question.itemId,
                          {
                              selectedOptionKey:
                                  question.answerMode === "CHOICE" && !isSentenceOrder
                                      ? selectedOptionKey
                                      : null,
                              selectedOptionKeys:
                                  question.answerMode === "CHOICE" && isSentenceOrder
                                      ? selectedOptionKeys
                                      : [],
                              textAnswer:
                                  question.answerMode === "TEXT"
                                      ? textAnswer.trim()
                                      : null,
                              idempotencyKey: attempt.idempotencyKey,
                          },
                      );

            submissionAttemptRef.current = null;
            setRerecordRequested(false);
            await applyResult(result);
            return true;
        } catch (error) {
            console.error("Failed to submit Level Test answer.", error);
            const errorCode = getApiErrorCode(error);
            if (isRecoverableStaleItemError(errorCode)) {
                try {
                    await recoverCurrentQuestion();
                    setActionErrorCode("LEVEL_TEST_ITEM_REFRESHED");
                } catch (recoveryError) {
                    console.error("Failed to refresh stale Level Test item.", recoveryError);
                    setActionErrorCode(errorCode ?? "UNKNOWN");
                }
                return false;
            }
            setActionErrorCode(errorCode ?? "UNKNOWN");
            return false;
        } finally {
            submitInFlightRef.current = false;
            setIsSubmitting(false);
        }
    }, [
        applyResult,
        canSubmit,
        isRecoverableStaleItemError,
        isSentenceOrder,
        question,
        recoverCurrentQuestion,
        recorder.audioBlob,
        recorder.elapsedSeconds,
        selectedOptionKey,
        selectedOptionKeys,
        sessionId,
        textAnswer,
    ]);

    const prepareRerecord = useCallback(() => {
        if (!requiresRerecord) return;
        submissionAttemptRef.current = null;
        setActionErrorCode(null);
        resetRecorder();
        setRerecordRequested(true);
    }, [requiresRerecord, resetRecorder]);

    const retryEvaluation = useCallback(async () => {
        if (!question || isRetrying || retryInFlightRef.current) return false;
        retryInFlightRef.current = true;
        setIsRetrying(true);
        setActionErrorCode(null);
        try {
            const result = await languageLearningLevelService.retryEvaluation(
                sessionId,
                question.itemId,
            );
            await applyResult(result);
            return true;
        } catch (error) {
            const errorCode = getApiErrorCode(error);
            if (isRecoverableStaleItemError(errorCode)) {
                try {
                    await recoverCurrentQuestion();
                    setActionErrorCode("LEVEL_TEST_ITEM_REFRESHED");
                } catch (recoveryError) {
                    console.error("Failed to refresh stale Level Test item.", recoveryError);
                    setActionErrorCode(errorCode ?? "UNKNOWN");
                }
                return false;
            }
            setActionErrorCode(errorCode ?? "UNKNOWN");
            return false;
        } finally {
            retryInFlightRef.current = false;
            setIsRetrying(false);
        }
    }, [
        applyResult,
        isRecoverableStaleItemError,
        isRetrying,
        question,
        recoverCurrentQuestion,
        sessionId,
    ]);

    const playReferenceAudio = useCallback(
        async (audio: HTMLAudioElement | null) => {
            if (!audio || !question?.referenceAudioAvailable) return false;
            const playbackLimit = Math.max(
                0,
                question.referencePlaybackLimit ??
                    (question.domain === "LISTENING" ? 2 : 0),
            );
            if (playbackLimit === 0 || referencePlaybackCount >= playbackLimit) return false;
            setIsAudioLoading(true);
            setActionErrorCode(null);
            try {
                let url = referenceAudioUrl;
                if (!url) {
                    const blob = await languageLearningLevelService.fetchReferenceAudio(
                        question.itemId,
                    );
                    url = URL.createObjectURL(blob);
                    setReferenceAudioUrl(url);
                }
                audio.src = url;
                audio.playbackRate = 1;
                await audio.play();
                setReferencePlaybackCount((count) => Math.min(playbackLimit, count + 1));
                return true;
            } catch (error) {
                setActionErrorCode(getApiErrorCode(error) ?? "LEVEL_TEST_AUDIO_INVALID");
                return false;
            } finally {
                setIsAudioLoading(false);
            }
        },
        [question, referenceAudioUrl, referencePlaybackCount],
    );

    const addOrderKey = useCallback((key: string) => {
        setSelectedOptionKeys((current) =>
            current.includes(key) ? current : [...current, key],
        );
    }, []);

    const moveOrderKey = useCallback((index: number, offset: -1 | 1) => {
        setSelectedOptionKeys((current) => {
            const target = index + offset;
            if (target < 0 || target >= current.length) return current;
            const next = [...current];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    }, []);

    const removeOrderKey = useCallback((key: string) => {
        setSelectedOptionKeys((current) => current.filter((value) => value !== key));
    }, []);

    const answerAcceptedNextQuestionFailed =
        actionErrorCode === "LEVEL_TEST_NEXT_QUESTION_REFRESH_FAILED";
    const loadError = Boolean(
        sessionQuery.isError ||
            questionQuery.isError ||
            answerAcceptedNextQuestionFailed,
    );

    return {
        session,
        question,
        learningLanguage: entry.setting?.learningLanguage ?? null,
        selectedOptionKey,
        selectedOptionKeys,
        textAnswer,
        lastResult,
        evaluationReasonCode,
        requiresRerecord,
        rerecordRequested,
        actionErrorCode,
        answerAcceptedNextQuestionFailed,
        isLoading:
            !loadError &&
            (!sessionValidated ||
                (session == null && sessionQuery.isLoading) ||
                (session?.status !== "COMPLETED" && !questionValidated) ||
                (question == null && questionQuery.isLoading) ||
                (cachedQuestion != null && !questionIsCurrent)),
        loadError,
        isSubmitting,
        isRetrying,
        canSubmit,
        recorder,
        microphone,
        referenceAudioUrl,
        referencePlaybackCount,
        isAudioLoading,
        headingRef,
        setSelectedOptionKey,
        setTextAnswer,
        addOrderKey,
        moveOrderKey,
        removeOrderKey,
        submit,
        prepareRerecord,
        retryEvaluation,
        playReferenceAudio,
        reload: recoverCurrentQuestion,
    };
}

export type LevelTestSessionController = ReturnType<
    typeof useLevelTestSessionController
>;
