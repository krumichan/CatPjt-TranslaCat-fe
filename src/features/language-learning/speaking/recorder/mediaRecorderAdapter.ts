export type MicrophoneFailureReason =
    | "UNSUPPORTED"
    | "DENIED"
    | "NO_DEVICE"
    | "DEVICE_BUSY"
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

export async function requestMicrophoneStream(): Promise<MediaStream> {
    if (!supportsAudioRecording()) {
        throw new MicrophoneAccessError(
            "UNSUPPORTED",
            "Audio recording is not supported by this browser.",
        );
    }

    try {
        return await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
        });
    } catch (error) {
        throw new MicrophoneAccessError(
            mapMediaError(error),
            error instanceof Error ? error.message : "Microphone access failed.",
        );
    }
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

export async function queryMicrophonePermission(): Promise<PermissionState | null> {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) {
        return null;
    }

    try {
        const result = await navigator.permissions.query({
            name: "microphone" as PermissionName,
        });
        return result.state;
    } catch {
        return null;
    }
}
