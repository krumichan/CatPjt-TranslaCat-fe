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

function requestStream(
    request: () => Promise<MediaStream>,
    signal?: AbortSignal,
): Promise<MediaStream> {
    signal?.throwIfAborted();

    // 권한 창 자체는 취소할 수 없다. 취소 뒤 늦게 받은 트랙도 반드시 반납한다.
    return new Promise((resolve, reject) => {
        const abort = () => reject(new DOMException("Voice preparation cancelled.", "AbortError"));
        signal?.addEventListener("abort", abort, { once: true });
        let requested: Promise<MediaStream>;
        try {
            requested = request();
        } catch (error) {
            signal?.removeEventListener("abort", abort);
            reject(error);
            return;
        }
        requested.then((stream) => {
            signal?.removeEventListener("abort", abort);
            if (signal?.aborted) {
                stopVoiceMediaStream(stream);
                abort();
                return;
            }
            resolve(stream);
        }, (error: unknown) => {
            signal?.removeEventListener("abort", abort);
            reject(error);
        });
    });
}

async function requestMicrophone(signal?: AbortSignal): Promise<MediaStream> {
    requireMediaDevices();

    try {
        return await requestStream(() => navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
            video: false,
        }), signal);
    } catch (error) {
        signal?.throwIfAborted();
        throw new VoiceMediaError(
            "MICROPHONE_PERMISSION",
            error instanceof Error ? error.message : "Microphone permission denied.",
        );
    }
}

async function requestDisplayAudio(signal?: AbortSignal): Promise<MediaStream> {
    requireMediaDevices();

    if (!navigator.mediaDevices.getDisplayMedia) {
        throw new VoiceMediaError(
            "MEDIA_DEVICE_UNSUPPORTED",
            "getDisplayMedia is unavailable.",
        );
    }

    let stream: MediaStream;
    try {
        stream = await requestStream(() => navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
        }), signal);
    } catch (error) {
        signal?.throwIfAborted();
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
    signal?: AbortSignal,
): Promise<PreparedVoiceMedia> {
    if (mode === "MIC") {
        return { SELF: await requestMicrophone(signal) };
    }

    if (mode === "MEDIA") {
        return { REMOTE: await requestDisplayAudio(signal) };
    }

    // 사용자 클릭의 활성화가 필요한 화면 공유부터 요청한다.
    const remote = await requestDisplayAudio(signal);
    try {
        const self = await requestMicrophone(signal);
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
