"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslations } from "next-intl";

import {
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
import { speakingAssistanceService } from "@/services/language-learning/speakingAssistanceService";
import { speakingReadAloudService } from "@/services/language-learning/speakingReadAloudService";
import { speakingSessionService } from "@/services/language-learning/speakingSessionService";
import { speakingTurnService } from "@/services/language-learning/speakingTurnService";
import { sttErrorReportService } from "@/services/language-learning/sttErrorReportService";
import type {
    AssistanceType,
    SpeakingAssistanceResponse,
    SpeakingTurn,
    SttErrorReportCreateRequest,
} from "@/types/language-learning/speaking";

const READ_ALOUD_PROBLEM_COUNT = 5;
const READ_ALOUD_REQUIRED_ATTEMPTS = 2;
const READ_ALOUD_MAX_ATTEMPTS = 3;

export type SpeakingTurnUiPhase =
    | "IDLE"
    | "PREPARING_UPLOAD"
    | "PROCESSING"
    | "RETRYING"
    | "EVALUATING_PROBLEM"
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
    const [assistanceResults, setAssistanceResults] = useState<
        Partial<Record<AssistanceType, SpeakingAssistanceResponse>>
    >({});
    const [assistanceLoadingType, setAssistanceLoadingType] =
        useState<AssistanceType | null>(null);
    const [assistanceError, setAssistanceError] = useState(false);
    const [highlightedTurnId, setHighlightedTurnId] = useState<number | null>(
        null,
    );
    const [lastReportReference, setLastReportReference] = useState<
        string | null
    >(null);
    const [localAudioUrls, setLocalAudioUrls] = useState<
        Record<number, string>
    >({});
    const [rerecordTargetTurnId, setRerecordTargetTurnId] = useState<
        number | null
    >(null);
    const [thirdAttemptProblemIndex, setThirdAttemptProblemIndex] = useState<
        number | null
    >(null);
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
    const eligibility = detail?.evaluationEligibility ?? null;
    const isReadAloud = detail?.session.practiceMode === "READ_ALOUD";

    const readAloudProblemEvaluations = useMemo(
        () => detail?.readAloudProblemEvaluations ?? [],
        [detail?.readAloudProblemEvaluations],
    );
    const readAloudSubmittedProblemCount = useMemo(
        () =>
            new Set(
                readAloudProblemEvaluations.map((item) => item.problemIndex),
            ).size,
        [readAloudProblemEvaluations],
    );
    const readAloudActiveProblemIndex = Math.min(
        readAloudSubmittedProblemCount + 1,
        READ_ALOUD_PROBLEM_COUNT,
    );
    const readAloudActiveTurns = useMemo(
        () =>
            (detail?.turns ?? [])
                .filter(
                    (turn) =>
                        turn.problemIndex === readAloudActiveProblemIndex,
                )
                .sort(
                    (a, b) =>
                        (a.attemptIndex ?? 0) - (b.attemptIndex ?? 0),
                ),
        [detail?.turns, readAloudActiveProblemIndex],
    );
    const readAloudEvaluationTurns = useMemo(
        () =>
            readAloudActiveTurns.filter(
                (turn) => !turn.excludedFromEvaluation,
            ),
        [readAloudActiveTurns],
    );
    const readAloudIncludedTurns = useMemo(
        () =>
            readAloudEvaluationTurns.filter((turn) =>
                Boolean(turn.transcript?.trim()),
            ),
        [readAloudEvaluationTurns],
    );
    const readAloudSttRatio =
        readAloudEvaluationTurns.length === 0
            ? 0
            : readAloudIncludedTurns.length / readAloudEvaluationTurns.length;
    const readAloudNextAttemptIndex = Math.min(
        readAloudActiveTurns.length + 1,
        READ_ALOUD_MAX_ATTEMPTS,
    );
    const readAloudCurrentProblemSubmitted = readAloudProblemEvaluations.some(
        (item) => item.problemIndex === readAloudActiveProblemIndex,
    );
    const readAloudNextProblemPrepared =
        readAloudActiveProblemIndex >= READ_ALOUD_PROBLEM_COUNT ||
        readAloudActiveTurns.some((turn) => Boolean(turn.assistantText?.trim()));
    const readAloudCanEvaluate =
        isReadAloud &&
        !readAloudCurrentProblemSubmitted &&
        readAloudEvaluationTurns.length >= READ_ALOUD_REQUIRED_ATTEMPTS &&
        readAloudEvaluationTurns.length <= READ_ALOUD_MAX_ATTEMPTS &&
        readAloudSttRatio >= 0.8 &&
        readAloudNextProblemPrepared;
    const readAloudCanAddThird =
        isReadAloud &&
        !readAloudCurrentProblemSubmitted &&
        readAloudActiveTurns.length === READ_ALOUD_REQUIRED_ATTEMPTS;
    const readAloudThirdAttemptEnabled =
        thirdAttemptProblemIndex === readAloudActiveProblemIndex;
    const readAloudShouldOfferThird =
        readAloudCanAddThird &&
        (readAloudIncludedTurns.length < READ_ALOUD_REQUIRED_ATTEMPTS ||
            readAloudActiveTurns.some(
                (turn) =>
                    turn.sttConfidence !== null && turn.sttConfidence < 0.7,
            ));
    const rerecordTargetTurn = useMemo(
        () =>
            detail?.turns.find((turn) => turn.id === rerecordTargetTurnId) ??
            null,
        [detail?.turns, rerecordTargetTurnId],
    );

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
        },
        [recorder.audioBlob, recorder.elapsedSeconds],
    );

    const isBusy = turnPhase !== "IDLE";
    const readAloudCanCreateAttempt =
        !isReadAloud ||
        rerecordTargetTurn !== null ||
        readAloudActiveTurns.length < READ_ALOUD_REQUIRED_ATTEMPTS ||
        (readAloudActiveTurns.length < READ_ALOUD_MAX_ATTEMPTS &&
            (readAloudThirdAttemptEnabled ||
                readAloudIncludedTurns.length < READ_ALOUD_REQUIRED_ATTEMPTS));
    const canRecord =
        detail?.session.status === "IN_PROGRESS" &&
        microphone.canRecord &&
        !isBusy &&
        readAloudCanCreateAttempt;

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
            if (session.practiceMode === "READ_ALOUD" && rerecordTargetTurn) {
                const grant =
                    await speakingTurnService.createRerecordUploadGrant(
                        sessionId,
                        rerecordTargetTurn.id,
                    );
                setTurnPhase("PROCESSING");
                const turn = await speakingTurnService.process(
                    sessionId,
                    grant,
                    recorder.audioBlob,
                    recorder.elapsedSeconds,
                    [],
                    true,
                );
                rememberLocalAudio(turn.id, recorder.audioBlob);
                await sessionQuery.mutate(undefined, true);
                setHighlightedTurnId(turn.id);
                setRerecordTargetTurnId(null);
                recorder.reset();
                return true;
            }

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

            const problemIndex =
                session.practiceMode === "READ_ALOUD"
                    ? readAloudActiveProblemIndex
                    : null;
            const attemptIndex =
                session.practiceMode === "READ_ALOUD"
                    ? readAloudNextAttemptIndex
                    : null;
            const grant = await speakingTurnService.createUploadGrant(
                sessionId,
                nextTurnIndex,
                idempotencyKey,
                problemIndex,
                attemptIndex,
            );

            setTurnPhase("PROCESSING");
            const turn = await speakingTurnService.process(
                sessionId,
                grant,
                recorder.audioBlob,
                recorder.elapsedSeconds,
                session.practiceMode === "READ_ALOUD"
                    ? []
                    : selectedAssistance,
            );
            rememberLocalAudio(turn.id, recorder.audioBlob);
            clearSpeakingTurnIdempotencyKey(storageKey);
            await sessionQuery.mutate(undefined, true);
            setHighlightedTurnId(turn.id);
            setSelectedAssistance([]);
            setAssistanceResults({});
            setAssistanceError(false);
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
        readAloudActiveProblemIndex,
        readAloudNextAttemptIndex,
        recorder,
        recordingValidationError,
        rememberLocalAudio,
        rerecordTargetTurn,
        selectedAssistance,
        sessionId,
        sessionQuery,
    ]);

    const prepareRerecord = useCallback(
        (turn: SpeakingTurn) => {
            if (!isReadAloud || isBusy || controllerProblemSubmitted(
                readAloudProblemEvaluations,
                turn.problemIndex,
            )) {
                return false;
            }
            setRerecordTargetTurnId(turn.id);
            recorder.reset();
            document.getElementById("speaking-recorder")?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
            return true;
        },
        [isBusy, isReadAloud, readAloudProblemEvaluations, recorder],
    );

    const cancelRerecord = useCallback(() => {
        setRerecordTargetTurnId(null);
        recorder.reset();
    }, [recorder]);

    const enableThirdReadAloudAttempt = useCallback(() => {
        if (!readAloudCanAddThird) return;
        setThirdAttemptProblemIndex(readAloudActiveProblemIndex);
        recorder.reset();
        document.getElementById("speaking-recorder")?.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    }, [readAloudActiveProblemIndex, readAloudCanAddThird, recorder]);

    const evaluateReadAloudProblem = useCallback(async () => {
        if (!readAloudCanEvaluate || isBusy) return false;

        setActionError(false);
        setTurnPhase("EVALUATING_PROBLEM");
        try {
            await speakingReadAloudService.evaluateProblem(
                sessionId,
                readAloudActiveProblemIndex,
            );
            setThirdAttemptProblemIndex(null);
            setRerecordTargetTurnId(null);
            recorder.reset();
            await sessionQuery.mutate(undefined, true);
            if (readAloudActiveProblemIndex === READ_ALOUD_PROBLEM_COUNT) {
                router.push(
                    `/language-learning/speaking/${sessionId}/evaluation`,
                );
            } else {
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
            return true;
        } catch (error) {
            console.error("Failed to evaluate read-aloud problem.", error);
            setActionError(true);
            return false;
        } finally {
            setTurnPhase("IDLE");
        }
    }, [
        isBusy,
        readAloudActiveProblemIndex,
        readAloudCanEvaluate,
        recorder,
        router,
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

    const requestAssistance = useCallback(
        async (type: AssistanceType) => {
            if (isReadAloud || isBusy || assistanceLoadingType !== null) {
                return null;
            }

            const targetTurn = detail?.turns
                .filter((turn) => Boolean(turn.assistantText?.trim()))
                .at(-1);

            setAssistanceLoadingType(type);
            setAssistanceError(false);
            try {
                const result = await speakingAssistanceService.request(
                    sessionId,
                    {
                        type,
                        targetTurnId: targetTurn?.id ?? null,
                    },
                );
                setAssistanceResults((current) => ({
                    ...current,
                    [type]: result,
                }));
                setSelectedAssistance((current) => [...current, type]);
                return result;
            } catch (error) {
                console.error("Failed to load speaking assistance.", error);
                setAssistanceError(true);
                return null;
            } finally {
                setAssistanceLoadingType(null);
            }
        },
        [
            assistanceLoadingType,
            detail?.turns,
            isBusy,
            isReadAloud,
            sessionId,
        ],
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
                setLastReportReference(report.reportReference);
                return report;
            } catch (error) {
                console.error("Failed to create STT report.", error);
                setActionError(true);
                return null;
            }
        },
        [sessionId],
    );

    const requestSttSupport = useCallback(async (reportId: number) => {
        setActionError(false);
        try {
            const report = await sttErrorReportService.requestSupport(reportId);
            setLastReportReference(
                report.supportReference ?? report.reportReference,
            );
            return report;
        } catch (error) {
            console.error("Failed to request STT report support.", error);
            setActionError(true);
            return null;
        }
    }, []);

    const completeSession = useCallback(
        async (skipEvaluation = false) => {
            if (isBusy) return false;

            setTurnPhase("COMPLETING");
            setActionError(false);
            try {
                const session = await speakingSessionService.complete(
                    sessionId,
                    skipEvaluation,
                );
                await sessionQuery.mutate(undefined, true);
                router.push(
                    skipEvaluation
                        ? "/language-learning/history"
                        : `/language-learning/speaking/${session.id}/evaluation`,
                );
                return true;
            } catch (error) {
                console.error("Failed to complete speaking session.", error);
                setActionError(true);
                return false;
            } finally {
                setTurnPhase("IDLE");
            }
        },
        [isBusy, router, sessionId, sessionQuery],
    );

    const isReadAloudProblemSubmitted = useCallback(
        (problemIndex: number | null) =>
            controllerProblemSubmitted(
                readAloudProblemEvaluations,
                problemIndex,
            ),
        [readAloudProblemEvaluations],
    );

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
        assistanceResults,
        assistanceLoadingType,
        assistanceError,
        highlightedTurnId,
        lastReportReference,
        localAudioUrls,
        canRecord,
        isReadAloud,
        readAloudProblemCount: READ_ALOUD_PROBLEM_COUNT,
        readAloudRequiredAttempts: READ_ALOUD_REQUIRED_ATTEMPTS,
        readAloudMaxAttempts: READ_ALOUD_MAX_ATTEMPTS,
        readAloudSubmittedProblemCount,
        readAloudActiveProblemIndex,
        readAloudActiveTurns,
        readAloudEvaluationTurns,
        readAloudIncludedTurns,
        readAloudSttRatio,
        readAloudNextAttemptIndex,
        readAloudCanEvaluate,
        readAloudCanAddThird,
        readAloudThirdAttemptEnabled,
        readAloudShouldOfferThird,
        readAloudProblemEvaluations,
        rerecordTargetTurn,
        setHighlightedTurnId,
        requestAssistance,
        clearAssistance: () => {
            setSelectedAssistance([]);
            setAssistanceResults({});
            setAssistanceError(false);
        },
        submitRecording,
        prepareRerecord,
        cancelRerecord,
        enableThirdReadAloudAttempt,
        evaluateReadAloudProblem,
        isReadAloudProblemSubmitted,
        retryTurn,
        excludeTurn,
        createSttReport,
        requestSttSupport,
        completeSession,
        reload: async () => {
            await sessionQuery.mutate(undefined, true);
        },
    };
}

function controllerProblemSubmitted(
    evaluations: Array<{ problemIndex: number }>,
    problemIndex: number | null,
) {
    return (
        problemIndex !== null &&
        evaluations.some((item) => item.problemIndex === problemIndex)
    );
}

export type SpeakingSessionController = ReturnType<
    typeof useSpeakingSessionController
>;
