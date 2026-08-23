export const VOICE_PCM_SAMPLE_RATE = 16_000;
export const VOICE_PCM_CHANNELS = 1;
export const VOICE_PCM_FRAME_DURATION_MS = 100;
export const VOICE_PCM_SAMPLES_PER_FRAME =
    (VOICE_PCM_SAMPLE_RATE * VOICE_PCM_FRAME_DURATION_MS) / 1000;

function concatFloat32(
    left: Float32Array,
    right: Float32Array,
): Float32Array {
    if (left.length === 0) return right.slice();
    if (right.length === 0) return left.slice();

    const result = new Float32Array(left.length + right.length);
    result.set(left, 0);
    result.set(right, left.length);
    return result;
}

function resampleFrame(
    input: Float32Array,
    outputLength: number,
): Float32Array {
    if (input.length === outputLength) return input.slice();

    const output = new Float32Array(outputLength);
    const scale = input.length / outputLength;

    for (let i = 0; i < outputLength; i += 1) {
        const position = i * scale;
        const leftIndex = Math.floor(position);
        const rightIndex = Math.min(leftIndex + 1, input.length - 1);
        const mix = position - leftIndex;
        const left = input[leftIndex] ?? 0;
        const right = input[rightIndex] ?? left;
        output[i] = left + (right - left) * mix;
    }

    return output;
}

function floatToPcmS16Le(samples: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(samples.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < samples.length; i += 1) {
        const sample = Math.max(-1, Math.min(1, samples[i] ?? 0));
        const value = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(i * 2, Math.round(value), true);
    }

    return buffer;
}

/**
 * Browser AudioWorklet chunk size/sample rate is implementation dependent.
 * Source samples are first accumulated in 100ms windows and each window is
 * normalized to exactly 1600 PCM S16LE mono samples (16kHz x 100ms).
 */
export class VoicePcmFrameEncoder {
    private pending: Float32Array<ArrayBufferLike> = new Float32Array(0);
    private sourceSampleRate: number | null = null;

    push(input: Float32Array, sourceSampleRate: number): ArrayBuffer[] {
        if (sourceSampleRate <= 0) return [];

        if (
            this.sourceSampleRate !== null &&
            this.sourceSampleRate !== sourceSampleRate
        ) {
            this.pending = new Float32Array(0);
        }
        this.sourceSampleRate = sourceSampleRate;
        this.pending = concatFloat32(this.pending, input);

        const sourceSamplesPerFrame = Math.max(
            1,
            Math.round(
                (sourceSampleRate * VOICE_PCM_FRAME_DURATION_MS) / 1000,
            ),
        );
        const frames: ArrayBuffer[] = [];

        while (this.pending.length >= sourceSamplesPerFrame) {
            const sourceFrame = this.pending.slice(0, sourceSamplesPerFrame);
            this.pending = this.pending.slice(sourceSamplesPerFrame);
            frames.push(
                floatToPcmS16Le(
                    resampleFrame(sourceFrame, VOICE_PCM_SAMPLES_PER_FRAME),
                ),
            );
        }

        return frames;
    }

    reset() {
        this.pending = new Float32Array(0);
        this.sourceSampleRate = null;
    }
}
