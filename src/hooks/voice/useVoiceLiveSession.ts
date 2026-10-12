import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
    startVoiceAudioCapture,
    type VoiceAudioCapture,
} from "@/features/voice/audio/voiceAudioCapture";
import {
    INITIAL_VOICE_INPUT,
    type VoiceInputActivity,
} from "@/features/voice/audio/voiceInputMonitor";
import {
    prepareVoiceMedia,
    stopPreparedVoiceMedia,
    stopVoiceMediaStream,
    VoiceMediaError,
    type PreparedVoiceMedia,
} from "@/features/voice/audio/voiceMedia";
import {
    INITIAL_VOICE_LIVE_STATE,
    voiceLiveReducer,
} from "@/features/voice/session/voiceLiveReducer";
import {
    channelsForVoiceMode,
    DEFAULT_VOICE_SESSION_SETUP,
    toVoiceSessionCreateRequest,
    type VoiceSessionSetupState,
} from "@/features/voice/session/voiceModePolicy";
import { VoiceChannelSocket } from "@/features/voice/stream/VoiceChannelSocket";
import { voiceSessionService } from "@/services/voice/voiceSessionService";
import type {
    VoiceChannel,
    VoiceClientChannelState,
    VoiceLanguage,
    VoiceSessionResponse,
} from "@/types/voice";

export type VoiceLivePhase =
    | "IDLE"
    | "PREPARING"
    | "STREAMING"
    | "COMPLETING"
    | "COMPLETED"
    | "ERROR";
export type VoiceUiErrorCode =
    | "MEDIA_DEVICE_UNSUPPORTED"
    | "MICROPHONE_PERMISSION"
    | "DISPLAY_PERMISSION"
    | "DISPLAY_AUDIO_REQUIRED"
    | "START_FAILED"
    | "COMPLETE_FAILED"
    | "INPUT_ENDED"
    | "FINALIZE_FAILED";

type ChannelRuntime = {
    socket: VoiceChannelSocket;
    stream: MediaStream;
    capture: VoiceAudioCapture | null;
    state: VoiceClientChannelState;
};
type UseVoiceLiveSessionOptions = { onCompleted?: () => void | Promise<void> };

export function useVoiceLiveSession(options: UseVoiceLiveSessionOptions = {}) {
    const [setup, setSetup] = useState<VoiceSessionSetupState>(DEFAULT_VOICE_SESSION_SETUP);
    const [phase, setPhase] = useState<VoiceLivePhase>("IDLE");
    const [session, setSession] = useState<VoiceSessionResponse | null>(null);
    const [errorCode, setErrorCode] = useState<VoiceUiErrorCode | null>(null);
    const [liveState, dispatch] = useReducer(voiceLiveReducer, INITIAL_VOICE_LIVE_STATE);
    const [inputActivities, setInputActivities] = useState<Record<VoiceChannel, VoiceInputActivity>>({
        SELF: INITIAL_VOICE_INPUT,
        REMOTE: INITIAL_VOICE_INPUT,
    });

    const runtimesRef = useRef(new Map<VoiceChannel, ChannelRuntime>());
    const preparedMediaRef = useRef<PreparedVoiceMedia>({});
    const mountedRef = useRef(true);
    const revisionRef = useRef(0);
    const busyRef = useRef(false);
    const completionAttemptRef = useRef(0);
    const startupRef = useRef<AbortController | null>(null);
    const sessionRef = useRef<VoiceSessionResponse | null>(null);
    const onCompletedRef = useRef(options.onCompleted);
    onCompletedRef.current = options.onCompleted;

    const setChannelState = useCallback((channel: VoiceChannel, state: VoiceClientChannelState) => {
        if (mountedRef.current) dispatch({ type: "CHANNEL_STATE", channel, state });
        const runtime = runtimesRef.current.get(channel);
        if (!runtime) return;
        runtime.state = state;
        if (state === "STREAMING") {
            runtime.capture?.resume();
        } else {
            runtime.capture?.pause();
        }
    }, []);

    const cleanupRuntime = useCallback(async (graceful = false, retainDraining = false) => {
        // 현재 소유 자원을 먼저 떼어낸다. 비동기 close가 새 시작의 스트림을 정리하지 않게 한다.
        const runtimes = [...runtimesRef.current.entries()];
        const prepared = preparedMediaRef.current;
        if (!retainDraining) runtimesRef.current.clear();
        preparedMediaRef.current = {};
        if (!retainDraining) {
            startupRef.current?.abort();
            startupRef.current = null;
        }
        stopPreparedVoiceMedia(prepared);
        await Promise.all(runtimes.map(async ([channel, runtime]) => {
            const drained = graceful
                ? runtime.socket.closeGracefully("CLIENT_LEAVE")
                : runtime.socket.closeLocal();
            if (mountedRef.current) {
                dispatch({ type: "CHANNEL_STATE", channel, state: "DISCONNECTED" });
                setInputActivities((current) => ({ ...current, [channel]: { status: "ENDED", level: 0 } }));
            }
            await runtime.capture?.stop().catch(() => undefined);
            await drained;
            if (retainDraining && runtimesRef.current.get(channel) === runtime) {
                runtimesRef.current.delete(channel);
            }
        }));
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            revisionRef.current += 1;
            const activeSession = sessionRef.current;
            sessionRef.current = null;
            void cleanupRuntime(true);
            // 레지스트리에 연결이 남아 있을 때 완료 요청도 시작해 종료 ACK 실패를 서버가 확인한다.
            if (activeSession && !["COMPLETED", "FAILED"].includes(activeSession.status)) {
                void voiceSessionService.complete(activeSession.id).catch(() => undefined);
            }
        };
    }, [cleanupRuntime]);

    const updateSetup = useCallback(<K extends keyof VoiceSessionSetupState>(key: K, value: VoiceSessionSetupState[K]) => {
        setSetup((current) => ({ ...current, [key]: value }));
    }, []);
    const setManualSourceLanguage = useCallback((channel: VoiceChannel, language: VoiceLanguage) => {
        setSetup((current) => ({ ...current, manualSourceLanguages: { ...current.manualSourceLanguages, [channel]: language } }));
    }, []);

    const start = useCallback(async () => {
        if (busyRef.current || phase === "STREAMING"
            || (sessionRef.current && !["COMPLETED", "FAILED"].includes(sessionRef.current.status))) return false;

        // 렌더 이전의 중복 클릭과 각 await 뒤의 늦은 결과를 동일한 작업 소유권으로 막는다.
        busyRef.current = true;
        const revision = ++revisionRef.current;
        const controller = new AbortController();
        startupRef.current = controller;
        const isCurrent = () => mountedRef.current && revisionRef.current === revision && !controller.signal.aborted;
        const requireCurrent = () => {
            if (!isCurrent()) throw new DOMException("Voice start cancelled.", "AbortError");
        };
        setPhase("PREPARING");
        setErrorCode(null);
        setSession(null);
        sessionRef.current = null;
        dispatch({ type: "RESET" });
        setInputActivities({ SELF: INITIAL_VOICE_INPUT, REMOTE: INITIAL_VOICE_INPUT });

        let prepared: PreparedVoiceMedia = {};
        let createdSession: VoiceSessionResponse | null = null;
        try {
            // 화면 공유는 사용자 클릭 직후 요청한다. 취소 뒤 허용된 권한은 media helper가 반납한다.
            prepared = await prepareVoiceMedia(setup.mode, controller.signal);
            requireCurrent();
            preparedMediaRef.current = prepared;
            createdSession = await voiceSessionService.create(toVoiceSessionCreateRequest(setup));
            requireCurrent();
            sessionRef.current = createdSession;
            setSession(createdSession);

            let connectedChannelCount = 0;
            for (const channel of channelsForVoiceMode(setup.mode)) {
                requireCurrent();
                const stream = prepared[channel];
                if (!stream) continue;
                const socket = new VoiceChannelSocket({
                    sessionId: createdSession.id,
                    channel,
                    ticketProvider: async () => {
                        const response = await voiceSessionService.issueWebSocketTicket(
                            createdSession!.id,
                            channel,
                            controller.signal,
                        );
                        return response.ticket;
                    },
                    onEvent: (event) => {
                        if (isCurrent()) dispatch({ type: "EVENT", event });
                    },
                    onStateChange: (state) => {
                        if (isCurrent()) setChannelState(channel, state);
                    },
                });
                const runtime: ChannelRuntime = { socket, stream, capture: null, state: "CONNECTING" };
                runtimesRef.current.set(channel, runtime);

                try {
                    await socket.connect();
                    requireCurrent();
                    runtime.capture = await startVoiceAudioCapture({
                        stream,
                        signal: controller.signal,
                        onFrame: (frame) => {
                            if (isCurrent()) socket.sendAudio(frame);
                        },
                        onInputActivity: (activity) => {
                            if (!isCurrent()) return;
                            setInputActivities((current) => ({ ...current, [channel]: activity }));
                            if (activity.status === "ENDED") {
                                // 공유 종료는 네트워크 재연결로 복구할 수 없다. 남은 회의 채널은 계속 처리한다.
                                void socket.closeGracefully("INPUT_ENDED").then((acknowledged) => {
                                    if (!acknowledged && isCurrent()) setErrorCode("FINALIZE_FAILED");
                                });
                                stopVoiceMediaStream(stream);
                                if ([...runtimesRef.current.values()].every((item) =>
                                    item.stream.getAudioTracks().every((track) => track.readyState === "ended"))) {
                                    setErrorCode("INPUT_ENDED");
                                    setPhase("ERROR");
                                }
                            }
                        },
                    });
                    requireCurrent();
                    if (runtime.state !== "STREAMING") runtime.capture.pause();
                    if (stream.getAudioTracks().some((track) => track.readyState === "live")) connectedChannelCount += 1;
                } catch (error) {
                    socket.closeLocal();
                    await runtime.capture?.stop().catch(() => undefined);
                    stopVoiceMediaStream(stream);
                    if (isCurrent()) {
                        runtimesRef.current.delete(channel);
                        delete prepared[channel];
                        setChannelState(channel, "ERROR");
                        console.error(`Voice ${channel} channel failed to start.`, error);
                    }
                    requireCurrent();
                }
            }
            requireCurrent();
            if (connectedChannelCount === 0) throw new Error("No Voice channel reached STREAM_READY.");
            setPhase("STREAMING");
            return true;
        } catch (error) {
            // 취소된 이전 작업의 결과는 현재 세션을 건드리지 않고 자기 자원만 정리한다.
            stopPreparedVoiceMedia(prepared);
            if (isCurrent()) {
                await cleanupRuntime();
                if (mountedRef.current && revisionRef.current === revision) {
                    sessionRef.current = null;
                    setSession(null);
                    setErrorCode(error instanceof VoiceMediaError ? error.code : "START_FAILED");
                    setPhase("ERROR");
                }
            }
            if (createdSession) void voiceSessionService.complete(createdSession.id).catch(() => undefined);
            return false;
        } finally {
            if (revisionRef.current === revision) busyRef.current = false;
        }
    }, [cleanupRuntime, phase, setChannelState, setup]);

    const complete = useCallback(async () => {
        const activeSession = sessionRef.current;
        if (!activeSession || busyRef.current || phase === "COMPLETED") return false;
        busyRef.current = true;
        const revision = revisionRef.current;
        const completionAttempt = ++completionAttemptRef.current;
        setPhase("COMPLETING");
        setErrorCode(null);
        for (const runtime of runtimesRef.current.values()) {
            runtime.capture?.pause();
            runtime.socket.disableReconnect();
        }

        try {
            // BE의 마지막 발화 저장을 먼저 기다린다. 실패해도 로컬 캡처는 반드시 종료한다.
            const completed = await voiceSessionService.complete(activeSession.id);
            if (revisionRef.current !== revision) return true;
            await cleanupRuntime();
            if (!mountedRef.current || revisionRef.current !== revision) return true;
            sessionRef.current = completed;
            setSession(completed);
            setPhase(completed.status === "FAILED" ? "ERROR" : "COMPLETED");
            if (completed.status === "FAILED") setErrorCode("FINALIZE_FAILED");
            // 이력 새로고침 실패가 완료된 세션을 오류로 되돌리지 않게 한다.
            await Promise.resolve().then(() => onCompletedRef.current?.()).catch(() => undefined);
            return completed.status !== "FAILED";
        } catch (error) {
            if (revisionRef.current !== revision) return false;
            // 응답 실패는 서버 처리 취소가 아니다. 입력만 반납하고 재시도 가능한 종료 핸들을 남긴다.
            void cleanupRuntime(true, true);
            if (mountedRef.current && revisionRef.current === revision) {
                setErrorCode("COMPLETE_FAILED");
                setPhase("ERROR");
                // 서버가 실패 상태로 이미 종료한 경우 반복 종료에 갇히지 않도록 상태를 확인한다.
                void voiceSessionService.get(activeSession.id).then((latest) => {
                    if (!mountedRef.current || revisionRef.current !== revision
                        || completionAttemptRef.current !== completionAttempt) {
                        return;
                    }
                    if (latest.status === "FAILED" || latest.status === "COMPLETED") {
                        void cleanupRuntime();
                        sessionRef.current = latest;
                        setSession(latest);
                        setPhase(latest.status === "FAILED" ? "ERROR" : "COMPLETED");
                        setErrorCode(latest.status === "FAILED" ? "FINALIZE_FAILED" : null);
                        void Promise.resolve().then(() => onCompletedRef.current?.()).catch(() => undefined);
                    }
                }).catch(() => undefined);
            }
            console.error("Failed to complete Voice Translation V2.", error);
            return false;
        } finally {
            if (revisionRef.current === revision) busyRef.current = false;
        }
    }, [cleanupRuntime, phase]);

    const reset = useCallback(async () => {
        revisionRef.current += 1;
        busyRef.current = false;
        const activeSession = sessionRef.current;
        sessionRef.current = null;
        // 화면 상태는 즉시 초기화하고, 이전 연결은 소유권을 분리해 마지막 결과까지 받는다.
        void cleanupRuntime(true);
        if (activeSession && !["COMPLETED", "FAILED"].includes(activeSession.status)) {
            void voiceSessionService.complete(activeSession.id).catch(() => undefined);
        }
        if (!mountedRef.current) return;
        setSession(null);
        setErrorCode(null);
        setPhase("IDLE");
        dispatch({ type: "RESET" });
    }, [cleanupRuntime]);

    return {
        setup,
        phase,
        session,
        errorCode,
        liveState,
        inputActivities,
        channels: channelsForVoiceMode(setup.mode),
        isBusy: phase === "PREPARING" || phase === "COMPLETING",
        canStart: phase === "IDLE" || phase === "COMPLETED" || (phase === "ERROR" && (!session || session.status === "FAILED")),
        canComplete: Boolean(session) && session?.status !== "FAILED" && phase !== "PREPARING" && phase !== "COMPLETING" && phase !== "COMPLETED",
        updateSetup,
        setManualSourceLanguage,
        start,
        complete,
        reset,
    };
}

export type VoiceLiveSessionController = ReturnType<typeof useVoiceLiveSession>;
