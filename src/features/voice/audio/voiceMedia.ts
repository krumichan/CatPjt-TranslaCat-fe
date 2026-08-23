import type { VoiceChannel, VoiceMode } from "@/types/voice";

export type PreparedVoiceMedia = Partial<Record<VoiceChannel, MediaStream>>;

export type VoiceMediaErrorCode =
    | "MEDIA_DEVICE_UNSUPPORTED"
    | "MICROPHONE_PERMISSION"
    | "DISPLAY_PERMISSION"
    | "DISPLAY_AUDIO_REQUIRED";

export class VoiceMediaError extends Error {
    readonly code: VoiceMediaErrorCode;

    constructor(code: VoiceMediaErrorCode, message: string) {
        super(message);
        this.name = "VoiceMediaError";
        this.code = code;
    }
}

function requireMediaDevices() {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new VoiceMediaError(
            "MEDIA_DEVICE_UNSUPPORTED",
            "MediaDevices API is unavailable.",
        );
    }
}

async function requestMicrophone(): Promise<MediaStream> {
    requireMediaDevices();

    try {
        return await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
            video: false,
        });
    } catch (error) {
        throw new VoiceMediaError(
            "MICROPHONE_PERMISSION",
            error instanceof Error ? error.message : "Microphone permission denied.",
        );
    }
}

async function requestDisplayAudio(): Promise<MediaStream> {
    requireMediaDevices();

    if (!navigator.mediaDevices.getDisplayMedia) {
        throw new VoiceMediaError(
            "MEDIA_DEVICE_UNSUPPORTED",
            "getDisplayMedia is unavailable.",
        );
    }

    let stream: MediaStream;
    try {
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
        });
    } catch (error) {
        throw new VoiceMediaError(
            "DISPLAY_PERMISSION",
            error instanceof Error ? error.message : "Display permission denied.",
        );
    }

    if (stream.getAudioTracks().length === 0) {
        stopVoiceMediaStream(stream);
        throw new VoiceMediaError(
            "DISPLAY_AUDIO_REQUIRED",
            "The selected display source does not provide audio.",
        );
    }

    return stream;
}

export async function prepareVoiceMedia(
    mode: VoiceMode,
): Promise<PreparedVoiceMedia> {
    if (mode === "MIC") {
        return { SELF: await requestMicrophone() };
    }

    if (mode === "MEDIA") {
        return { REMOTE: await requestDisplayAudio() };
    }

    // getDisplayMedia has the strictest user-gesture requirement, so request it first.
    const remote = await requestDisplayAudio();
    try {
        const self = await requestMicrophone();
        return { SELF: self, REMOTE: remote };
    } catch (error) {
        stopVoiceMediaStream(remote);
        throw error;
    }
}

export function stopVoiceMediaStream(stream: MediaStream | undefined | null) {
    stream?.getTracks().forEach((track) => track.stop());
}

export function stopPreparedVoiceMedia(media: PreparedVoiceMedia) {
    Object.values(media).forEach((stream) => stopVoiceMediaStream(stream));
}
