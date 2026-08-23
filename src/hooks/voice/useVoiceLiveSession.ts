import {
    useCallback,
    useEffect,
    useReducer,
    useRef,
    useState,
} from "react";

import {
    startVoiceAudioCapture,
    type VoiceAudioCapture,
} from "@/features/voice/audio/voiceAudioCapture";
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
    VoicePublicEvent,
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
    | "COMPLETE_FAILED";

type ChannelRuntime = {
    socket: VoiceChannelSocket;
    stream: MediaStream;
    capture: VoiceAudioCapture | null;
};

type UseVoiceLiveSessionOptions = {
    onCompleted?: () => void | Promise<void>;
};

export function useVoiceLiveSession(
    options: UseVoiceLiveSessionOptions = {},
) {
    const [setup, setSetup] = useState<VoiceSessionSetupState>(
        DEFAULT_VOICE_SESSION_SETUP,
    );
    const [phase, setPhase] = useState<VoiceLivePhase>("IDLE");
    const [session, setSession] = useState<VoiceSessionResponse | null>(null);
    const [errorCode, setErrorCode] = useState<VoiceUiErrorCode | null>(null);
    const [liveState, dispatch] = useReducer(
        voiceLiveReducer,
        INITIAL_VOICE_LIVE_STATE,
    );

    const runtimesRef = useRef(new Map<VoiceChannel, ChannelRuntime>());
    const preparedMediaRef = useRef<PreparedVoiceMedia>({});
    const mountedRef = useRef(true);
    const onCompletedRef = useRef(options.onCompleted);
    onCompletedRef.current = options.onCompleted;

    const setChannelState = useCallback(
        (channel: VoiceChannel, state: VoiceClientChannelState) => {
            dispatch({ type: "CHANNEL_STATE", channel, state });

            const capture = runtimesRef.current.get(channel)?.capture;
            if (!capture) return;

            if (state === "STREAMING") {
                capture.resume();
            } else if (
                state === "CONNECTING" ||
                state === "RECONNECTING" ||
                state === "BACKPRESSURED" ||
                state === "ERROR"
            ) {
                capture.pause();
            }
        },
        [],
    );

    const handleEvent = useCallback((event: VoicePublicEvent) => {
        dispatch({ type: "EVENT", event });
    }, []);

    const cleanupRuntime = useCallback(async () => {
        const runtimes = [...runtimesRef.current.values()];
        runtimesRef.current.clear();

        for (const runtime of runtimes) {
            runtime.socket.disableReconnect();
            runtime.socket.closeLocal();
            await runtime.capture?.stop().catch(() => undefined);
        }

        stopPreparedVoiceMedia(preparedMediaRef.current);
        preparedMediaRef.current = {};
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            void cleanupRuntime();
        };
    }, [cleanupRuntime]);

    const updateSetup = useCallback(
        <K extends keyof VoiceSessionSetupState>(
            key: K,
            value: VoiceSessionSetupState[K],
        ) => {
            setSetup((current) => ({ ...current, [key]: value }));
        },
        [],
    );

    const setManualSourceLanguage = useCallback(
        (channel: VoiceChannel, language: VoiceLanguage) => {
            setSetup((current) => ({
                ...current,
                manualSourceLanguages: {
                    ...current.manualSourceLanguages,
                    [channel]: language,
                },
            }));
        },
        [],
    );

    const start = useCallback(async () => {
        if (phase === "PREPARING" || phase === "STREAMING" || phase === "COMPLETING") {
            return false;
        }

        setPhase("PREPARING");
        setErrorCode(null);
        setSession(null);
        dispatch({ type: "RESET" });

        let prepared: PreparedVoiceMedia = {};
        let createdSession: VoiceSessionResponse | null = null;

        try {
            // Request browser media while the click's user activation is still valid.
            prepared = await prepareVoiceMedia(setup.mode);
            preparedMediaRef.current = prepared;

            createdSession = await voiceSessionService.create(
                toVoiceSessionCreateRequest(setup),
            );
            if (!mountedRef.current) return false;
            setSession(createdSession);

            let connectedChannelCount = 0;
            for (const channel of channelsForVoiceMode(setup.mode)) {
                const stream = prepared[channel];
                if (!stream) continue;

                const socket = new VoiceChannelSocket({
                    sessionId: createdSession.id,
                    channel,
                    ticketProvider: async () => {
                        const response =
                            await voiceSessionService.issueWebSocketTicket(
                                createdSession!.id,
                                channel,
                            );
                        return response.ticket;
                    },
                    onEvent: handleEvent,
                    onStateChange: (state) => setChannelState(channel, state),
                });

                const runtime: ChannelRuntime = {
                    socket,
                    stream,
                    capture: null,
                };
                runtimesRef.current.set(channel, runtime);

                try {
                    await socket.connect();
                    runtime.capture = await startVoiceAudioCapture({
                        stream,
                        onFrame: (frame) => {
                            socket.sendAudio(frame);
                        },
                    });
                    connectedChannelCount += 1;
                } catch (error) {
                    console.error(`Voice ${channel} channel failed to start.`, error);
                    socket.closeLocal();
                    await runtime.capture?.stop().catch(() => undefined);
                    runtimesRef.current.delete(channel);
                    stopVoiceMediaStream(stream);
                    delete prepared[channel];
                    setChannelState(channel, "ERROR");
                }
            }

            if (connectedChannelCount === 0) {
                await voiceSessionService
                    .complete(createdSession.id)
                    .catch(() => undefined);
                throw new Error("No Voice channel reached STREAM_READY.");
            }

            if (mountedRef.current) setPhase("STREAMING");
            return true;
        } catch (error) {
            console.error("Failed to start Voice Translation V2.", error);

            if (createdSession) {
                await voiceSessionService
                    .complete(createdSession.id)
                    .catch(() => undefined);
            }
            await cleanupRuntime();

            if (mountedRef.current) {
                setSession(null);
                setErrorCode(
                    error instanceof VoiceMediaError ? error.code : "START_FAILED",
                );
                setPhase("ERROR");
            }
            return false;
        }
    }, [
        cleanupRuntime,
        handleEvent,
        phase,
        setChannelState,
        setup,
    ]);

    const complete = useCallback(async () => {
        if (!session || phase === "COMPLETING" || phase === "COMPLETED") {
            return false;
        }

        setPhase("COMPLETING");
        setErrorCode(null);

        for (const runtime of runtimesRef.current.values()) {
            runtime.capture?.pause();
            runtime.socket.disableReconnect();
        }

        try {
            // BE owns STREAM_FLUSH -> final persist -> STREAM_CLOSE ordering.
            const completed = await voiceSessionService.complete(session.id);
            await cleanupRuntime();

            if (!mountedRef.current) return true;
            setSession(completed);
            setPhase("COMPLETED");
            await onCompletedRef.current?.();
            return true;
        } catch (error) {
            console.error("Failed to complete Voice Translation V2.", error);
            if (mountedRef.current) {
                setErrorCode("COMPLETE_FAILED");
                setPhase("ERROR");
            }
            return false;
        }
    }, [cleanupRuntime, phase, session]);

    const reset = useCallback(async () => {
        await cleanupRuntime();
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
        channels: channelsForVoiceMode(setup.mode),
        isBusy: phase === "PREPARING" || phase === "COMPLETING",
        canStart:
            phase === "IDLE" || phase === "ERROR" || phase === "COMPLETED",
        canComplete:
            Boolean(session) &&
            phase !== "PREPARING" &&
            phase !== "COMPLETING" &&
            phase !== "COMPLETED",
        updateSetup,
        setManualSourceLanguage,
        start,
        complete,
        reset,
    };
}

export type VoiceLiveSessionController = ReturnType<typeof useVoiceLiveSession>;
