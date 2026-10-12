class AudioProcessor extends AudioWorkletProcessor {
    process(inputs) {
        const input = inputs[0];
        if (input && input.length > 0) {
            // 탭 공유의 스테레오 음성을 모든 채널에서 모노로 합친다.
            const mono = new Float32Array(input[0].length);
            for (const channel of input) {
                for (let index = 0; index < mono.length; index += 1) {
                    mono[index] += (channel[index] ?? 0) / input.length;
                }
            }
            this.port.postMessage(mono);
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
