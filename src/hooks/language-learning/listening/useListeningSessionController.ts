"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createIdempotencyKey } from "@/features/language-learning/listening/idempotency";
import { useAudioRecorder } from "@/hooks/language-learning/speaking/useAudioRecorder";
import { useLanguageLearningEntryState } from "@/hooks/language-learning/useLanguageLearningEntryState";
import { useMicrophonePermission } from "@/hooks/language-learning/speaking/useMicrophonePermission";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/navigation";
import { listeningService } from "@/services/language-learning/listeningService";
import { ApiResponseError } from "@/services/common/responseParser";
import type {
    ListeningAssistanceType,
    ListeningPlaybackRequest,
    ListeningRevealAnswer,
    ListeningTaskType,
} from "@/types/language-learning/listening";

const TERMINAL_ATTEMPT = new Set(["EVALUATED", "NOT_EVALUABLE", "SKIPPED"]);

export function useListeningSessionController(sessionId: number) {
    const router = useRouter();
    const entry = useLanguageLearningEntryState();
    const pageStartedAt = useRef(Date.now());
    const resumeRequestedRef = useRef(false);
    const draftAttemptIdRef = useRef<number | null>(null);
    const pendingPlaybackEventsRef = useRef<Map<string, ListeningPlaybackRequest>>(new Map());
    const [drafts, setDrafts] = useState<Partial<Record<ListeningTaskType, string>>>({});
    const [referenceAudioUrl, setReferenceAudioUrl] = useState<string | null>(null);
    const [referenceAudioLoading, setReferenceAudioLoading] = useState(false);
    const [playbackRate, setPlaybackRate] = useState<1 | 0.75>(1);
    const [revealedAnswer, setRevealedAnswer] = useState<ListeningRevealAnswer | null>(null);
    const [actionErrorCode, setActionErrorCode] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [assistanceNotice, setAssistanceNotice] = useState<ListeningAssistanceType | null>(null);

    const sessionQuery = useQuery({
        keys: ["listening-session", sessionId] as const,
        fetcher: (_key, id) => listeningService.getSession(id),
        config: { revalidateOnMount: true, shouldRetryOnError: false },
    });

    const session = sessionQuery.data ?? null;

    useEffect(() => {
        if (!session || resumeRequestedRef.current) return;
        if (session.status !== "IN_PROGRESS" && session.status !== "READY") return;

        resumeRequestedRef.current = true;
        void listeningService
            .resumeSession(session.sessionId)
            .then((resumed) => sessionQuery.mutate(resumed, false))
            .catch((error) => {
                setActionErrorCode(
                    error instanceof ApiResponseError
                        ? error.errorCode
                        : "UNKNOWN",
                );
            });
    }, [session, sessionQuery]);

    const currentAttempt = useMemo(() => {
        if (!session) return null;
        return session.attempts.find((attempt) => !TERMINAL_ATTEMPT.has(attempt.status)) ?? null;
    }, [session]);

    const itemQuery = useQuery({
        keys: currentAttempt ? (["listening-item", sessionId, currentAttempt.itemId] as const) : null,
        fetcher: (_key, id, itemId) => listeningService.getItem(id, itemId),
        enabled: currentAttempt !== null,
        config: { revalidateOnMount: true, shouldRetryOnError: false },
    });
    const queriedItem = itemQuery.data ?? null;
    const item = queriedItem
        && currentAttempt
        && queriedItem.itemId === currentAttempt.itemId
        && queriedItem.attempt.attemptId === currentAttempt.attemptId
        ? queriedItem
        : null;
    const attempt = item?.attempt ?? currentAttempt;
    const selectedTaskTypes = useMemo(
        () => attempt?.tasks
            .filter((task) => task.status !== "NOT_SELECTED")
            .map((task) => task.taskType) ?? [],
        [attempt],
    );
    const repeatTask = attempt?.tasks.find((task) => task.taskType === "REPEAT_AFTER_AUDIO") ?? null;
    const maxRecordingSeconds = Math.min(60, Math.max(1, Math.ceil((item?.audioDurationMs ?? 0) / 1000) + 15));
    const recorder = useAudioRecorder({
        maxSeconds: maxRecordingSeconds,
        navigationConfirmMessage: "녹음 중입니다. 페이지를 이동하시겠습니까?",
    });
    const microphone = useMicrophonePermission();

    useEffect(() => {
        if (!item?.attempt) return;

        const attemptChanged =
            draftAttemptIdRef.current !== item.attempt.attemptId;

        if (attemptChanged) {
            draftAttemptIdRef.current = item.attempt.attemptId;
            const next: Partial<Record<ListeningTaskType, string>> = {};
            for (const task of item.attempt.tasks) {
                if (task.taskType === "DICTATION"
                    || task.taskType === "INTERPRETATION") {
                    next[task.taskType] = task.answerText ?? "";
                }
            }
            setDrafts(next);
            pageStartedAt.current = Date.now();
            setActionErrorCode(null);
            setAssistanceNotice(null);
            setPlaybackRate(1);
            setRevealedAnswer(null);
            setReferenceAudioUrl((current) => {
                if (current) URL.revokeObjectURL(current);
                return null;
            });
        }

        if (item.attempt.answerRevealed && item.sourceText) {
            setRevealedAnswer({
                attemptId: item.attempt.attemptId,
                sourceText: item.sourceText,
                referenceMeanings: item.referenceMeanings ?? [],
                excludedFromProgress: true,
                excludedFromProfile: true,
            });
        }
    }, [item]);

    useEffect(() => {
        if (!attempt || !["SUBMITTED", "EVALUATING"].includes(attempt.status)) return;
        const timer = window.setInterval(async () => {
            await Promise.all([
                sessionQuery.mutate((current) => current, true),
                itemQuery.mutate((current) => current, true),
            ]);
        }, 2000);
        return () => window.clearInterval(timer);
    }, [attempt, itemQuery, sessionQuery]);

    useEffect(() => {
        return () => {
            if (referenceAudioUrl) URL.revokeObjectURL(referenceAudioUrl);
        };
    }, [referenceAudioUrl]);

    const updateDraft = useCallback((task: ListeningTaskType, value: string) => {
        setDrafts((current) => ({ ...current, [task]: value }));
        setActionErrorCode(null);
    }, []);

    const ensureReferenceAudio = useCallback(async () => {
        if (!item) return null;
        if (referenceAudioUrl) return referenceAudioUrl;
        setReferenceAudioLoading(true);
        try {
            const blob = await listeningService.fetchReferenceAudio(item.itemId);
            const url = URL.createObjectURL(blob);
            setReferenceAudioUrl(url);
            return url;
        } catch (error) {
            setActionErrorCode(error instanceof ApiResponseError ? error.errorCode : "LISTENING_AUDIO_INVALID");
            return null;
        } finally {
            setReferenceAudioLoading(false);
        }
    }, [item, referenceAudioUrl]);

    const sendPlaybackEvent = useCallback(async (request: ListeningPlaybackRequest) => {
        if (!session || !item) return false;
        try {
            await listeningService.recordPlayback(session.sessionId, item.itemId, request);
            pendingPlaybackEventsRef.current.delete(request.clientEventId);
            return true;
        } catch {
            pendingPlaybackEventsRef.current.set(request.clientEventId, request);
            window.setTimeout(() => {
                void listeningService
                    .recordPlayback(session.sessionId, item.itemId, request)
                    .then(() => {
                        pendingPlaybackEventsRef.current.delete(request.clientEventId);
                    })
                    .catch(() => undefined);
            }, 1500);
            return false;
        }
    }, [item, session]);

    const retryPendingPlaybackEvents = useCallback(async () => {
        if (!session || !item) return;
        const pending = [...pendingPlaybackEventsRef.current.values()];
        await Promise.all(
            pending.map(async (request) => {
                try {
                    await listeningService.recordPlayback(
                        session.sessionId,
                        item.itemId,
                        request,
                    );
                    pendingPlaybackEventsRef.current.delete(request.clientEventId);
                } catch {
                    // Playback event delivery is best-effort until submit.
                }
            }),
        );
    }, [item, session]);

    const recordAssistance = useCallback(async (type: ListeningAssistanceType) => {
        if (!attempt || !session) return;

        const requests = selectedTaskTypes.map((taskType) => {
            const task = attempt.tasks.find((candidate) => candidate.taskType === taskType);
            const currentUsage = task?.assistanceUsage ?? [];
            const nextUsage = currentUsage.some((usage) => usage.type === type)
                ? currentUsage.map((usage) => usage.type === type
                    ? { ...usage, count: usage.count + 1 }
                    : usage)
                : [...currentUsage, { type, count: 1 }];

            return listeningService.saveAssistance(attempt.attemptId, taskType, nextUsage);
        });

        try {
            await Promise.all(requests);
            setAssistanceNotice(type);
            await itemQuery.mutate(undefined, true);
        } catch (error) {
            setActionErrorCode(error instanceof ApiResponseError ? error.errorCode : "UNKNOWN");
        }
    }, [attempt, itemQuery, selectedTaskTypes, session]);

    const playReference = useCallback(async (audio: HTMLAudioElement | null, slow = false) => {
        if (!audio || !attempt) return false;
        const url = await ensureReferenceAudio();
        if (!url) return false;
        audio.src = url;
        audio.playbackRate = slow ? 0.75 : 1;
        setPlaybackRate(slow ? 0.75 : 1);

        const playbackRequest: ListeningPlaybackRequest = {
            attemptId: attempt.attemptId,
            playbackType: slow ? "SLOW" : "NORMAL",
            clientEventId: createIdempotencyKey("listening-playback"),
        };
        pendingPlaybackEventsRef.current.set(
            playbackRequest.clientEventId,
            playbackRequest,
        );
        void sendPlaybackEvent(playbackRequest);

        try {
            await audio.play();
            await recordAssistance(slow ? "SLOW_PLAYBACK" : "REPLAY");
            return true;
        } catch {
            setActionErrorCode("LISTENING_AUDIO_INVALID");
            return false;
        }
    }, [attempt, ensureReferenceAudio, recordAssistance, sendPlaybackEvent]);

    const confirmRecording = useCallback(async () => {
        if (!attempt || !recorder.audioBlob || isUploading) return false;
        setIsUploading(true);
        setActionErrorCode(null);
        try {
            await listeningService.uploadAudio(attempt.attemptId, recorder.audioBlob, recorder.elapsedSeconds * 1000);
            await itemQuery.mutate(undefined, true);
            return true;
        } catch (error) {
            setActionErrorCode(error instanceof ApiResponseError ? error.errorCode : "LISTENING_AUDIO_INVALID");
            return false;
        } finally {
            setIsUploading(false);
        }
    }, [attempt, isUploading, itemQuery, recorder.audioBlob, recorder.elapsedSeconds]);

    const revealAnswer = useCallback(async () => {
        if (!attempt) return false;
        setActionErrorCode(null);
        try {
            const answer = await listeningService.revealAnswer(attempt.attemptId);
            setRevealedAnswer(answer);
            await Promise.all([itemQuery.mutate(undefined, true), sessionQuery.mutate(undefined, true)]);
            return true;
        } catch (error) {
            setActionErrorCode(error instanceof ApiResponseError ? error.errorCode : "UNKNOWN");
            return false;
        }
    }, [attempt, itemQuery, sessionQuery]);

    const canSubmit = useMemo(() => {
        if (!attempt || !session || isSubmitting) return false;
        for (const taskType of selectedTaskTypes) {
            if (taskType === "REPEAT_AFTER_AUDIO") {
                const task = attempt.tasks.find((candidate) => candidate.taskType === taskType);
                if (!task?.audioUploaded) return false;
            } else if (!(drafts[taskType] ?? "").trim()) {
                return false;
            }
        }
        return true;
    }, [attempt, drafts, isSubmitting, selectedTaskTypes, session]);

    const submit = useCallback(async () => {
        if (!attempt || !session || !canSubmit) return false;
        setIsSubmitting(true);
        setActionErrorCode(null);
        try {
            await retryPendingPlaybackEvents();
            for (const taskType of selectedTaskTypes) {
                if (taskType === "REPEAT_AFTER_AUDIO") continue;
                const task = attempt.tasks.find((candidate) => candidate.taskType === taskType);
                await listeningService.saveText(attempt.attemptId, taskType, {
                    answer: (drafts[taskType] ?? "").trim(),
                    assistanceUsage: task?.assistanceUsage ?? [],
                    idempotencyKey: createIdempotencyKey(`listening-${taskType.toLowerCase()}`),
                });
            }
            await listeningService.submit(attempt.attemptId, {
                idempotencyKey: createIdempotencyKey("listening-submit"),
                actualDurationMs: Date.now() - pageStartedAt.current,
            });
            setDrafts({});
            recorder.reset();
            await Promise.all([sessionQuery.mutate(undefined, true), itemQuery.mutate(undefined, true)]);
            return true;
        } catch (error) {
            setActionErrorCode(error instanceof ApiResponseError ? error.errorCode : "UNKNOWN");
            return false;
        } finally {
            setIsSubmitting(false);
        }
    }, [
        attempt,
        canSubmit,
        drafts,
        itemQuery,
        recorder,
        retryPendingPlaybackEvents,
        selectedTaskTypes,
        session,
        sessionQuery,
    ]);

    const skip = useCallback(async () => {
        if (!attempt) return false;
        setActionErrorCode(null);
        try {
            await listeningService.skip(attempt.attemptId, {
                idempotencyKey: createIdempotencyKey("listening-skip"),
                actualDurationMs: Date.now() - pageStartedAt.current,
            });
            setDrafts({});
            recorder.reset();
            await sessionQuery.mutate(undefined, true);
            return true;
        } catch (error) {
            setActionErrorCode(error instanceof ApiResponseError ? error.errorCode : "UNKNOWN");
            return false;
        }
    }, [attempt, recorder, sessionQuery]);

    const complete = useCallback(async () => {
        if (!session || currentAttempt || isCompleting) return false;
        setIsCompleting(true);
        try {
            if (session.status !== "COMPLETED") {
                await listeningService.complete(
                    session.sessionId,
                    Date.now() - pageStartedAt.current,
                );
            }
            router.push(`/language-learning/listening/session/${session.sessionId}/result`);
            return true;
        } catch (error) {
            setActionErrorCode(error instanceof ApiResponseError ? error.errorCode : "UNKNOWN");
            return false;
        } finally {
            setIsCompleting(false);
        }
    }, [currentAttempt, isCompleting, router, session]);

    return {
        entry,
        session,
        item,
        attempt,
        selectedTaskTypes,
        drafts,
        repeatTask,
        recorder,
        microphone,
        referenceAudioUrl,
        referenceAudioLoading,
        playbackRate,
        revealedAnswer,
        assistanceNotice,
        actionErrorCode,
        isLoading:
            (session === null && sessionQuery.isLoading) ||
            (currentAttempt !== null && item === null && itemQuery.isLoading),
        loadError: sessionQuery.isError || itemQuery.isError,
        isSubmitting,
        isUploading,
        isCompleting,
        canSubmit,
        maxRecordingSeconds,
        updateDraft,
        ensureReferenceAudio,
        playReference,
        recordAssistance,
        confirmRecording,
        revealAnswer,
        submit,
        skip,
        complete,
        reload: async () => {
            await Promise.all([sessionQuery.mutate(undefined, true), itemQuery.mutate(undefined, true)]);
        },
    };
}

export type ListeningSessionController = ReturnType<typeof useListeningSessionController>;
