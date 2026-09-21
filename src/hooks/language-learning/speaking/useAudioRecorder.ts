"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
    createMediaRecorder,
    requestMicrophoneStream,
    stopMicrophoneStream,
} from "@/features/language-learning/speaking/recorder/mediaRecorderAdapter";

export type AudioRecorderState =
    | "IDLE"
    | "STARTING"
    | "RECORDING"
    | "RECORDED"
    | "ERROR";

interface UseAudioRecorderOptions {
    maxSeconds: number;
    warningSeconds?: number;
    navigationConfirmMessage?: string;
}

export function useAudioRecorder({
    maxSeconds,
    warningSeconds = 5,
    navigationConfirmMessage,
}: UseAudioRecorderOptions) {
    const [state, setState] = useState<AudioRecorderState>("IDLE");
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startedAtRef = useRef<number | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const epochRef = useRef(0);
    const startingRef = useRef(false);
    const pendingStreamRef = useRef<AbortController | null>(null);

    const clearTimers = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (maxTimerRef.current) {
            clearTimeout(maxTimerRef.current);
            maxTimerRef.current = null;
        }
    }, []);

    const releaseStream = useCallback(() => {
        stopMicrophoneStream(streamRef.current);
        streamRef.current = null;
    }, []);

    const clearPreview = useCallback(() => {
        setPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return null;
        });
    }, []);

    const stop = useCallback(() => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === "inactive") {
            return;
        }
        recorder.stop();
    }, []);

    const start = useCallback(async () => {
        if (startingRef.current || recorderRef.current?.state === "recording") {
            return false;
        }

        startingRef.current = true;
        const epoch = ++epochRef.current;
        const controller = new AbortController();
        pendingStreamRef.current = controller;
        setState("STARTING");
        setError(false);
        setElapsedSeconds(0);
        setAudioBlob(null);
        clearPreview();
        chunksRef.current = [];

        try {
            const stream = await requestMicrophoneStream({ signal: controller.signal });
            if (epoch !== epochRef.current) {
                stopMicrophoneStream(stream);
                return false;
            }
            streamRef.current = stream;
            const recorder = createMediaRecorder(stream);
            recorderRef.current = recorder;
            startedAtRef.current = Date.now();

            recorder.addEventListener("dataavailable", (event) => {
                if (epoch !== epochRef.current) return;
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            });

            recorder.addEventListener("stop", () => {
                if (epoch !== epochRef.current) return;
                clearTimers();
                releaseStream();

                const duration = startedAtRef.current
                    ? Math.min(
                          maxSeconds,
                          (Date.now() - startedAtRef.current) / 1000,
                      )
                    : elapsedSeconds;
                setElapsedSeconds(Math.max(0, duration));

                const blob = new Blob(chunksRef.current, {
                    type: recorder.mimeType || "audio/webm",
                });
                setAudioBlob(blob);
                setPreviewUrl(URL.createObjectURL(blob));
                setState("RECORDED");
                recorderRef.current = null;
                startedAtRef.current = null;
            });

            recorder.addEventListener("error", () => {
                if (epoch !== epochRef.current) return;
                setError(true);
                clearTimers();
                releaseStream();
                setState("ERROR");
            });

            recorder.start(250);
            setState("RECORDING");

            intervalRef.current = setInterval(() => {
                if (!startedAtRef.current) return;
                setElapsedSeconds(
                    Math.min(
                        maxSeconds,
                        (Date.now() - startedAtRef.current) / 1000,
                    ),
                );
            }, 250);
            maxTimerRef.current = setTimeout(stop, maxSeconds * 1000);
            return true;
        } catch {
            if (epoch !== epochRef.current) return false;
            clearTimers();
            releaseStream();
            setError(true);
            setState("ERROR");
            return false;
        } finally {
            if (epoch === epochRef.current) {
                pendingStreamRef.current = null;
                startingRef.current = false;
            }
        }
    }, [
        clearPreview,
        clearTimers,
        elapsedSeconds,
        maxSeconds,
        releaseStream,
        stop,
    ]);

    const reset = useCallback(() => {
        epochRef.current++;
        pendingStreamRef.current?.abort();
        pendingStreamRef.current = null;
        startingRef.current = false;
        stop();
        clearTimers();
        releaseStream();
        recorderRef.current = null;
        clearPreview();
        chunksRef.current = [];
        setAudioBlob(null);
        setElapsedSeconds(0);
        setError(false);
        setState("IDLE");
    }, [clearPreview, clearTimers, releaseStream, stop]);

    useEffect(() => {
        const preventNavigation = (event: BeforeUnloadEvent) => {
            if (state !== "RECORDING") return;
            event.preventDefault();
            event.returnValue = "";
        };

        const confirmLinkNavigation = (event: MouseEvent) => {
            if (state !== "RECORDING" || !navigationConfirmMessage) return;
            if (!(event.target instanceof Element)) return;

            const link = event.target.closest("a[href]");
            if (!link) return;
            if (window.confirm(navigationConfirmMessage)) return;

            event.preventDefault();
            event.stopPropagation();
        };

        window.addEventListener("beforeunload", preventNavigation);
        document.addEventListener("click", confirmLinkNavigation, true);
        return () => {
            window.removeEventListener("beforeunload", preventNavigation);
            document.removeEventListener("click", confirmLinkNavigation, true);
        };
    }, [navigationConfirmMessage, state]);

    useEffect(
        () => () => {
            epochRef.current++;
            pendingStreamRef.current?.abort();
            pendingStreamRef.current = null;
            clearTimers();
            releaseStream();
        },
        [clearTimers, releaseStream],
    );

    useEffect(() => () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    return {
        state,
        elapsedSeconds,
        audioBlob,
        previewUrl,
        error,
        isRecording: state === "RECORDING",
        hasRecording: state === "RECORDED" && audioBlob !== null,
        remainingSeconds: Math.max(0, maxSeconds - elapsedSeconds),
        isNearLimit:
            state === "RECORDING" &&
            maxSeconds - elapsedSeconds <= warningSeconds,
        start,
        stop,
        reset,
    };
}
