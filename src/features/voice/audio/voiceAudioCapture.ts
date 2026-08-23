import { VoicePcmFrameEncoder } from "@/features/voice/audio/voicePcm";

export interface VoiceAudioCapture {
    pause(): void;
    resume(): void;
    stop(): Promise<void>;
}

interface StartVoiceAudioCaptureOptions {
    stream: MediaStream;
    onFrame: (frame: ArrayBuffer) => void;
}

export async function startVoiceAudioCapture({
    stream,
    onFrame,
}: StartVoiceAudioCaptureOptions): Promise<VoiceAudioCapture> {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
        throw new Error("Voice audio stream has no audio track.");
    }

    const audioOnlyStream = new MediaStream(audioTracks);
    const audioContext = new AudioContext({ sampleRate: 16_000 });
    if (audioContext.state === "suspended") {
        await audioContext.resume();
    }

    await audioContext.audioWorklet.addModule("/workers/audio-processor.js");

    const source = audioContext.createMediaStreamSource(audioOnlyStream);
    const processor = new AudioWorkletNode(audioContext, "audio-processor");
    const mute = audioContext.createGain();
    mute.gain.value = 0;

    const encoder = new VoicePcmFrameEncoder();
    let active = true;
    let stopped = false;

    processor.port.onmessage = (event: MessageEvent<unknown>) => {
        if (!active || stopped) return;

        const data = event.data;
        if (!(data instanceof Float32Array)) return;

        const frames = encoder.push(data, audioContext.sampleRate);
        frames.forEach(onFrame);
    };

    source.connect(processor);
    processor.connect(mute);
    mute.connect(audioContext.destination);

    return {
        pause() {
            active = false;
        },
        resume() {
            if (!stopped) active = true;
        },
        async stop() {
            if (stopped) return;
            stopped = true;
            active = false;
            encoder.reset();
            processor.port.onmessage = null;
            source.disconnect();
            processor.disconnect();
            mute.disconnect();
            if (audioContext.state !== "closed") {
                await audioContext.close();
            }
        },
    };
}
