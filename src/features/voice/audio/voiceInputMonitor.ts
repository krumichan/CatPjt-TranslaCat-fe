export type VoiceInputStatus = "WAITING" | "ACTIVE" | "LOW" | "SILENT" | "MUTED" | "ENDED";

export interface VoiceInputActivity {
    status: VoiceInputStatus;
    level: number;
}

export const INITIAL_VOICE_INPUT: VoiceInputActivity = { status: "WAITING", level: 0 };

/** 입력 상태 안내용이다. 작은 음성과 무음을 잘라내거나 STT 전송을 차단하지 않는다. */
export class VoiceInputMonitor {
    private peakRms = 0;
    private quietSince: number | null = null;
    private lowSince: number | null = null;

    push(samples: Float32Array): void {
        let energy = 0;
        for (const sample of samples) energy += sample * sample;
        this.peakRms = Math.max(this.peakRms, Math.sqrt(energy / Math.max(1, samples.length)));
    }

    sample(now: number): VoiceInputActivity {
        // 최근 구간의 최대 RMS를 표시해 프레임 사이의 짧은 공백에 안내가 깜박이지 않게 한다.
        const rms = this.peakRms;
        this.peakRms = 0;
        const decibels = 20 * Math.log10(Math.max(rms, 0.000001));
        const level = rms < 0.0001 ? 0 : Math.max(0, Math.min(1, (decibels + 80) / 70));

        this.quietSince = rms < 0.0001 ? (this.quietSince ?? now) : null;
        this.lowSince = rms >= 0.0001 && rms < 0.006 ? (this.lowSince ?? now) : null;
        if (this.quietSince !== null) {
            return { status: now - this.quietSince >= 1500 ? "SILENT" : "WAITING", level };
        }
        if (this.lowSince !== null && now - this.lowSince >= 1500) {
            return { status: "LOW", level };
        }
        return { status: "ACTIVE", level };
    }
}
