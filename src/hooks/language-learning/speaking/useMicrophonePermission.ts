"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
    MicrophoneAccessError,
    queryMicrophonePermission,
    requestMicrophoneStream,
    stopMicrophoneStream,
    supportsAudioRecording,
} from "@/features/language-learning/speaking/recorder/mediaRecorderAdapter";
import type { MicrophoneFailureReason } from "@/features/language-learning/speaking/recorder/mediaRecorderAdapter";

export type MicrophonePermissionState =
    | "CHECKING"
    | "PROMPT"
    | "GRANTED"
    | "DENIED"
    | "UNAVAILABLE";

export function useMicrophonePermission() {
    const [state, setState] = useState<MicrophonePermissionState>("CHECKING");
    const [failureReason, setFailureReason] =
        useState<MicrophoneFailureReason | null>(null);
    const [isRequesting, setIsRequesting] = useState(false);
    const epochRef = useRef(0);
    const pendingRef = useRef<AbortController | null>(null);

    const check = useCallback(async () => {
        const epoch = ++epochRef.current;
        if (!supportsAudioRecording()) {
            if (epoch === epochRef.current) {
                setState("UNAVAILABLE");
                setFailureReason("UNSUPPORTED");
            }
            return;
        }

        const permission = await queryMicrophonePermission();
        if (epoch !== epochRef.current) return;
        if (permission === "granted") {
            setState("GRANTED");
            setFailureReason(null);
            return;
        }
        if (permission === "denied") {
            setState("DENIED");
            setFailureReason("DENIED");
            return;
        }

        setState("PROMPT");
        setFailureReason(null);
    }, []);

    useEffect(() => {
        const epoch = epochRef;
        const pending = pendingRef;
        void check();
        return () => {
            epoch.current++;
            pending.current?.abort();
            pending.current = null;
        };
    }, [check]);

    const request = useCallback(async () => {
        if (pendingRef.current) return false;

        const controller = new AbortController();
        pendingRef.current = controller;
        const epoch = ++epochRef.current;
        setIsRequesting(true);
        try {
            const stream = await requestMicrophoneStream({ signal: controller.signal });
            stopMicrophoneStream(stream);
            if (epoch !== epochRef.current) return false;
            setState("GRANTED");
            setFailureReason(null);
            return true;
        } catch (error) {
            if (epoch !== epochRef.current) return false;
            const reason =
                error instanceof MicrophoneAccessError
                    ? error.reason
                    : "UNKNOWN";
            setFailureReason(reason);
            setState(reason === "UNSUPPORTED" ? "UNAVAILABLE"
                : reason === "DENIED" ? "DENIED" : "PROMPT");
            return false;
        } finally {
            if (epoch === epochRef.current) {
                pendingRef.current = null;
                setIsRequesting(false);
            }
        }
    }, []);

    const cancel = useCallback(() => {
        if (!pendingRef.current) return;
        epochRef.current++;
        pendingRef.current.abort();
        pendingRef.current = null;
        setIsRequesting(false);
        setState("PROMPT");
        setFailureReason("CANCELLED");
    }, []);

    return {
        state,
        failureReason,
        isRequesting,
        request,
        cancel,
        check,
        canRecord: state === "GRANTED",
    };
}
