import { VoicePcmFrameEncoder } from "@/features/voice/audio/voicePcm";
import { VoiceInputMonitor, type VoiceInputActivity } from "@/features/voice/audio/voiceInputMonitor";

export interface VoiceAudioCapture {
    pause(): void;
    resume(): void;
    stop(): Promise<void>;
}

interface StartVoiceAudioCaptureOptions {
    stream: MediaStream;
    onFrame: (frame: ArrayBuffer) => void;
    onInputActivity?: (activity: VoiceInputActivity) => void;
    signal?: AbortSignal;
}

export async function startVoiceAudioCapture({
    stream,
    onFrame,
    onInputActivity,
    signal,
}: StartVoiceAudioCaptureOptions): Promise<VoiceAudioCapture> {
    signal?.throwIfAborted();
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0 || audioTracks.every((track) => track.readyState === "ended")) {
        throw new Error("Voice audio stream has no live audio track.");
    }

    // 초기화 중 어느 단계에서 실패해도 이미 만든 자원과 이벤트 구독을 해제한다.
    const audioContext = new AudioContext({ sampleRate: 16_000 });
    const encoder = new VoicePcmFrameEncoder();
    const monitor = new VoiceInputMonitor();
    let source: MediaStreamAudioSourceNode | undefined;
    let processor: AudioWorkletNode | undefined;
    let mute: GainNode | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let active = true;
    let stopped = false;

    const stop = async () => {
        if (stopped) return;
        stopped = true;
        active = false;
        clearInterval(timer);
        encoder.reset();
        signal?.removeEventListener("abort", abort);
        audioTracks.forEach((track) => {
            track.removeEventListener("ended", ended);
            track.removeEventListener("mute", reportActivity);
            track.removeEventListener("unmute", reportActivity);
        });
        if (processor) processor.port.onmessage = null;
        source?.disconnect();
        processor?.disconnect();
        mute?.disconnect();
        if (audioContext.state !== "closed") await audioContext.close();
    };
    const abort = () => { void stop().catch(() => undefined); };
    const ended = () => {
        if (stopped || !audioTracks.every((track) => track.readyState === "ended")) return;
        onInputActivity?.({ status: "ENDED", level: 0 });
        void stop().catch(() => undefined);
    };
    const reportActivity = () => {
        if (stopped) return;
        const liveTracks = audioTracks.filter((track) => track.readyState !== "ended");
        const activity = monitor.sample(Date.now());
        onInputActivity?.(liveTracks.every((track) => track.muted)
            ? { status: "MUTED", level: 0 }
            : activity);
    };

    signal?.addEventListener("abort", abort, { once: true });
    audioTracks.forEach((track) => {
        track.addEventListener("ended", ended);
        track.addEventListener("mute", reportActivity);
        track.addEventListener("unmute", reportActivity);
    });

    try {
        if (audioContext.state === "suspended") await audioContext.resume();
        signal?.throwIfAborted();
        await audioContext.audioWorklet.addModule("/workers/audio-processor.js");
        signal?.throwIfAborted();
        if (stopped) throw new Error("Voice input ended during initialization.");

        source = audioContext.createMediaStreamSource(new MediaStream(audioTracks));
        processor = new AudioWorkletNode(audioContext, "audio-processor");
        mute = audioContext.createGain();
        mute.gain.value = 0;

        // 역압으로 전송을 멈춰도 입력 미터는 계속 갱신한다. 무음 역시 서버 VAD로 보낸다.
        processor.port.onmessage = (event: MessageEvent<unknown>) => {
            if (stopped || !(event.data instanceof Float32Array)) return;
            monitor.push(event.data);
            if (!active) return;
            encoder.push(event.data, audioContext.sampleRate).forEach(onFrame);
        };
        source.connect(processor);
        processor.connect(mute);
        mute.connect(audioContext.destination);
        timer = setInterval(reportActivity, 250);
        reportActivity();

        return {
            pause() {
                active = false;
                encoder.reset();
            },
            resume() {
                if (!stopped) active = true;
            },
            stop,
        };
    } catch (error) {
        await stop().catch(() => undefined);
        throw error;
    }
}
