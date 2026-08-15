"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslations } from "next-intl";

import {
    SPEAKING_EVALUATION_MIN_SECONDS,
    SPEAKING_EVALUATION_MIN_STT_RATIO,
    SPEAKING_EVALUATION_MIN_TURNS,
    SPEAKING_MAX_AUDIO_FILE_BYTES,
    SPEAKING_MAX_TURN_AUDIO_SECONDS,
    SPEAKING_MIN_VALID_AUDIO_SECONDS,
} from "@/constants/language-learning/speaking";
import {
    clearSpeakingTurnIdempotencyKey,
    getOrCreateSpeakingTurnIdempotencyKey,
} from "@/features/language-learning/speaking/session/speakingSessionStorage";
import { useAudioRecorder } from "@/hooks/language-learning/speaking/useAudioRecorder";
import { useMicrophonePermission } from "@/hooks/language-learning/speaking/useMicrophonePermission";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/navigation";
import { speakingSessionService } from "@/services/language-learning/speakingSessionService";
import { speakingTurnService } from "@/services/language-learning/speakingTurnService";
import { sttErrorReportService } from "@/services/language-learning/sttErrorReportService";
import type {
    AssistanceType,
    SpeakingTurn,
    SttErrorReportCreateRequest,
} from "@/types/language-learning/speaking";

export type SpeakingTurnUiPhase =
    | "IDLE"
    | "PREPARING_UPLOAD"
    | "PROCESSING"
    | "RETRYING"
    | "COMPLETING";

export type SpeakingRecordingValidationError =
    | "TOO_SHORT"
    | "TOO_LARGE"
    | null;

export function useSpeakingSessionController(sessionId: number) {
    const router = useRouter();
    const recorderT = useTranslations(
        "LanguageLearning.speaking.session.recorder",
    );
    const [turnPhase, setTurnPhase] = useState<SpeakingTurnUiPhase>("IDLE");
    const [actionError, setActionError] = useState(false);
    const [selectedAssistance, setSelectedAssistance] = useState<
        AssistanceType[]
    >([]);
    const [highlightedTurnId, setHighlightedTurnId] = useState<number | null>(
        null,
    );
    const [lastReportReference, setLastReportReference] = useState<
        string | null
    >(null);
    const [localAudioUrls, setLocalAudioUrls] = useState<
        Record<number, string>
    >({});
    const localAudioUrlsRef = useRef<Record<number, string>>({});

    const sessionQuery = useQuery({
        keys: ["speaking-session", sessionId] as const,
        fetcher: (_key, id) => speakingSessionService.get(id),
        config: {
            revalidateOnMount: true,
            refreshInterval: 4_000,
        },
    });

    useEffect(
        () => () => {
            Object.values(localAudioUrlsRef.current).forEach((url) => {
                URL.revokeObjectURL(url);
            });
        },
        [],
    );

    const rememberLocalAudio = useCallback((turnId: number, audio: Blob) => {
        const url = URL.createObjectURL(audio);
        const previous = localAudioUrlsRef.current[turnId];
        if (previous) URL.revokeObjectURL(previous);

        localAudioUrlsRef.current = {
            ...localAudioUrlsRef.current,
            [turnId]: url,
        };
        setLocalAudioUrls(localAudioUrlsRef.current);
    }, []);

    const recorder = useAudioRecorder({
        maxSeconds: SPEAKING_MAX_TURN_AUDIO_SECONDS,
        navigationConfirmMessage: recorderT("navigationConfirm"),
    });
    const microphone = useMicrophonePermission();
    const detail = sessionQuery.data ?? null;

    // Keep the client-side progress indicator aligned with BE's formal
    // SpeakingEvaluationEligibilityPolicy. A TTS-only partial failure can still
    // be a valid STT turn, so READY-only filtering would undercount progress.
    const eligibility = useMemo(() => {
        const turns = detail?.turns ?? [];
        const includedTurns = turns.filter(
            (turn) =>
                !turn.excludedFromEvaluation &&
                turn.status !== "AWAITING_UPLOAD",
        );
        const validSttTurns = includedTurns.filter((turn) =>
            Boolean(turn.transcript?.trim()),
        );
        const durationSeconds = validSttTurns.reduce(
            (sum, turn) => sum + turn.durationSeconds,
            0,
        );
        const sttRatio =
            includedTurns.length === 0
                ? 0
                : (validSttTurns.length / includedTurns.length) * 100;

        return {
            validTurns: validSttTurns.length,
            durationSeconds,
            sttRatio,
            eligible:
                validSttTurns.length >= SPEAKING_EVALUATION_MIN_TURNS &&
                durationSeconds >= SPEAKING_EVALUATION_MIN_SECONDS &&
                sttRatio >= SPEAKING_EVALUATION_MIN_STT_RATIO,
        };
    }, [detail?.turns]);

    const recordingValidationError = useMemo<SpeakingRecordingValidationError>(
        () => {
            if (!recorder.audioBlob) return null;
            if (recorder.elapsedSeconds < SPEAKING_MIN_VALID_AUDIO_SECONDS) {
                return "TOO_SHORT";
            }
            if (recorder.audioBlob.size > SPEAKING_MAX_AUDIO_FILE_BYTES) {
                return "TOO_LARGE";
            }
            return null;
        }, [recorder.audioBlob, recorder.elapsedSeconds],
    );

    const isBusy = turnPhase !== "IDLE";
    const canRecord =
        detail?.session.status === "IN_PROGRESS" &&
        microphone.canRecord &&
        !isBusy;

    const submitRecording = useCallback(async () => {
        const session = sessionQuery.data?.session;
        const turns = sessionQuery.data?.turns ?? [];
        if (
            !session ||
            !recorder.audioBlob ||
            recordingValidationError ||
            isBusy
        ) {
            return false;
        }

        setActionError(false);
        setTurnPhase("PREPARING_UPLOAD");
        try {
            const highestTurnIndex = turns.reduce(
                (highest, turn) => Math.max(highest, turn.turnIndex),
                0,
            );
            const nextTurnIndex =
                Math.max(session.completedTurns, highestTurnIndex) + 1;
            const { storageKey, idempotencyKey } =
                getOrCreateSpeakingTurnIdempotencyKey(
                    sessionId,
                    nextTurnIndex,
                );
            const grant = await speakingTurnService.createUploadGrant(
                sessionId,
                nextTurnIndex,
                idempotencyKey,
            );

            setTurnPhase("PROCESSING");
            const turn = await speakingTurnService.process(
                sessionId,
                grant,
                recorder.audioBlob,
                recorder.elapsedSeconds,
                selectedAssistance,
            );
            rememberLocalAudio(turn.id, recorder.audioBlob);
            clearSpeakingTurnIdempotencyKey(storageKey);
            await sessionQuery.mutate(undefined, true);
            setHighlightedTurnId(turn.id);
            setSelectedAssistance([]);
            recorder.reset();
            return true;
        } catch (error) {
            console.error("Failed to process speaking turn.", error);
            setActionError(true);
            return false;
        } finally {
            setTurnPhase("IDLE");
        }
    }, [
        isBusy,
        recorder,
        recordingValidationError,
        rememberLocalAudio,
        selectedAssistance,
        sessionId,
        sessionQuery,
    ]);

    const retryTurn = useCallback(
        async (turn: SpeakingTurn) => {
            if (isBusy) return false;

            setTurnPhase("RETRYING");
            setActionError(false);
            try {
                await speakingTurnService.retry(sessionId, turn.id);
                await sessionQuery.mutate(undefined, true);
                return true;
            } catch (error) {
                console.error("Failed to retry speaking turn.", error);
                setActionError(true);
                return false;
            } finally {
                setTurnPhase("IDLE");
            }
        },
        [isBusy, sessionId, sessionQuery],
    );

    const excludeTurn = useCallback(
        async (turnId: number) => {
            if (isBusy) return false;

            setActionError(false);
            try {
                await speakingTurnService.exclude(sessionId, turnId);
                await sessionQuery.mutate(undefined, true);
                return true;
            } catch (error) {
                console.error("Failed to exclude speaking turn.", error);
                setActionError(true);
                return false;
            }
        },
        [isBusy, sessionId, sessionQuery],
    );

    const createSttReport = useCallback(
        async (turnId: number, request: SttErrorReportCreateRequest) => {
            setActionError(false);
            try {
                const report = await sttErrorReportService.create(
                    sessionId,
                    turnId,
                    request,
                );
                setLastReportReference(
                    report.supportReference ?? report.reportReference,
                );
                return report;
            } catch (error) {
                console.error("Failed to create STT report.", error);
                setActionError(true);
                return null;
            }
        },
        [sessionId],
    );

    const completeSession = useCallback(async () => {
        if (isBusy) return false;

        setTurnPhase("COMPLETING");
        setActionError(false);
        try {
            const session = await speakingSessionService.complete(sessionId);
            await sessionQuery.mutate(undefined, true);
            router.push(`/language-learning/speaking/${session.id}/evaluation`);
            return true;
        } catch (error) {
            console.error("Failed to complete speaking session.", error);
            setActionError(true);
            return false;
        } finally {
            setTurnPhase("IDLE");
        }
    }, [isBusy, router, sessionId, sessionQuery]);

    return {
        detail,
        isLoading: sessionQuery.isLoading,
        loadError: Boolean(sessionQuery.isError),
        actionError,
        turnPhase,
        isBusy,
        recorder,
        microphone,
        eligibility,
        recordingValidationError,
        selectedAssistance,
        highlightedTurnId,
        lastReportReference,
        localAudioUrls,
        canRecord,
        setHighlightedTurnId,
        toggleAssistance: (type: AssistanceType) => {
            setSelectedAssistance((current) =>
                current.includes(type)
                    ? current.filter((item) => item !== type)
                    : [...current, type],
            );
        },
        clearAssistance: () => setSelectedAssistance([]),
        submitRecording,
        retryTurn,
        excludeTurn,
        createSttReport,
        completeSession,
        reload: async () => {
            await sessionQuery.mutate(undefined, true);
        },
    };
}

export type SpeakingSessionController = ReturnType<
    typeof useSpeakingSessionController
>;
