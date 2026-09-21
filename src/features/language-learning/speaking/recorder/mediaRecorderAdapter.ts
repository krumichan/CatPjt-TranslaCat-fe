export type MicrophoneFailureReason =
    | "UNSUPPORTED"
    | "DENIED"
    | "NO_DEVICE"
    | "DEVICE_BUSY"
    | "TIMED_OUT"
    | "CANCELLED"
    | "UNKNOWN";

export class MicrophoneAccessError extends Error {
    readonly reason: MicrophoneFailureReason;

    constructor(reason: MicrophoneFailureReason, message: string) {
        super(message);
        this.name = "MicrophoneAccessError";
        this.reason = reason;
    }
}

function mapMediaError(error: unknown): MicrophoneFailureReason {
    if (!(error instanceof DOMException)) {
        return "UNKNOWN";
    }

    switch (error.name) {
        case "NotAllowedError":
        case "SecurityError":
            return "DENIED";
        case "NotFoundError":
        case "DevicesNotFoundError":
            return "NO_DEVICE";
        case "NotReadableError":
        case "TrackStartError":
            return "DEVICE_BUSY";
        default:
            return "UNKNOWN";
    }
}

export function supportsAudioRecording(): boolean {
    return (
        typeof navigator !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof MediaRecorder !== "undefined"
    );
}

export async function requestMicrophoneStream(options: {
    signal?: AbortSignal;
    timeoutMs?: number;
} = {}): Promise<MediaStream> {
    if (!supportsAudioRecording()) {
        throw new MicrophoneAccessError(
            "UNSUPPORTED",
            "Audio recording is not supported by this browser.",
        );
    }

    const { signal, timeoutMs = 12000 } = options;
    if (signal?.aborted) {
        throw new MicrophoneAccessError("CANCELLED", "Microphone request was cancelled.");
    }
    // getUserMedia cannot itself be cancelled. If it settles after this wrapper,
    // the late stream must be closed rather than handed to an obsolete caller.
    return new Promise<MediaStream>((resolve, reject) => {
        let settled = false;
        const cleanup = () => {
            clearTimeout(timer);
            signal?.removeEventListener("abort", onAbort);
        };
        const fail = (reason: MicrophoneFailureReason, message: string) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new MicrophoneAccessError(reason, message));
        };
        const onAbort = () => fail("CANCELLED", "Microphone request was cancelled.");
        signal?.addEventListener("abort", onAbort, { once: true });
        const timer = setTimeout(
            () => fail("TIMED_OUT", "Microphone permission is still pending."),
            timeoutMs,
        );
        let media: Promise<MediaStream>;
        try {
            media = navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
        } catch (error) {
            fail(mapMediaError(error), error instanceof Error ? error.message : "Microphone access failed.");
            return;
        }
        void media.then((stream) => {
            if (settled) {
                stopMicrophoneStream(stream);
                return;
            }
            settled = true;
            cleanup();
            resolve(stream);
        }, (error: unknown) => fail(
            mapMediaError(error),
            error instanceof Error ? error.message : "Microphone access failed.",
        ));
        if (signal?.aborted) onAbort();
    });
}

export function stopMicrophoneStream(stream: MediaStream | null): void {
    stream?.getTracks().forEach((track) => track.stop());
}

export function resolveRecorderMimeType(): string | undefined {
    const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
    ];

    return candidates.find((candidate) =>
        MediaRecorder.isTypeSupported(candidate),
    );
}

export function createMediaRecorder(stream: MediaStream): MediaRecorder {
    const mimeType = resolveRecorderMimeType();
    return mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
}

export async function queryMicrophonePermission(timeoutMs = 3000): Promise<PermissionState | null> {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) {
        return null;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        const result = await Promise.race([
            navigator.permissions.query({ name: "microphone" as PermissionName }),
            new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); }),
        ]);
        if (!result) return null;
        return result.state;
    } catch {
        return null;
    } finally {
        if (timer) clearTimeout(timer);
    }
}
