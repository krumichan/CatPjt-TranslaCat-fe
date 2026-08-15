"use client";

import { useCallback, useEffect, useState } from "react";

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

    const check = useCallback(async () => {
        if (!supportsAudioRecording()) {
            setState("UNAVAILABLE");
            setFailureReason("UNSUPPORTED");
            return;
        }

        const permission = await queryMicrophonePermission();
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
        void check();
    }, [check]);

    const request = useCallback(async () => {
        if (isRequesting) return false;

        setIsRequesting(true);
        try {
            const stream = await requestMicrophoneStream();
            stopMicrophoneStream(stream);
            setState("GRANTED");
            setFailureReason(null);
            return true;
        } catch (error) {
            const reason =
                error instanceof MicrophoneAccessError
                    ? error.reason
                    : "UNKNOWN";
            setFailureReason(reason);
            setState(reason === "UNSUPPORTED" ? "UNAVAILABLE" : "DENIED");
            return false;
        } finally {
            setIsRequesting(false);
        }
    }, [isRequesting]);

    return {
        state,
        failureReason,
        isRequesting,
        request,
        check,
        canRecord: state === "GRANTED",
    };
}
