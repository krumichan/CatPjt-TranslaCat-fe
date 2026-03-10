self.process = { env: { NODE_ENV: 'development' } };

let transcriber = null;
let isInitializing = false; // [추가] 초기화 중인지 체크

const progress_callback = (data) => {
    console.log("Worker Raw Progress:", data); // [추가] 워커 콘솔에 직접 찍기

    // Transformers.js는 여러 상태를 뱉으므로 progress 외에도 처리
    if (data.status === 'progress' || data.status === 'downloading') {
        self.postMessage({
            status: 'progress',
            progress: data.progress || 0
        });
    }
};

self.onmessage = async (e) => {
    // 1. 초기화 신호 처리
    if (e.data.type === 'init') {
        if (transcriber || isInitializing) {
            return;
        }
        await startLoadingEngine();
        return;
    }

    const { audio, language } = e.data;

    // 2. 이미 엔진이 있으면 바로 분석 시작
    if (transcriber) {
        if (audio && audio instanceof Float32Array) {
            return runRecognition(audio, language);
        }
        return;
    }

    // 3. 엔진이 없는데 오디오 데이터가 먼저 들어온 경우 (공유 버튼부터 누른 경우)
    if (!isInitializing) {
        await startLoadingEngine(audio, language);
    }
};

async function startLoadingEngine(audio, language) {
    isInitializing = true;
    console.log("🚀 AI 엔진 초기화 시작...");
    self.postMessage({ status: 'loading', message: '번역 엔진을 준비하고 있어요...🐱' });

    try {
        const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        env.log_level = 'error';

        transcriber = await pipeline(
            'automatic-speech-recognition',
            'Xenova/whisper-tiny',
            { progress_callback, revision: 'main' }
        );

        console.log("✅ 모델 로드 완료!");
        self.postMessage({ status: 'ready', message: '준비 완료!' });
        isInitializing = false;

        // 로딩 완료 후 오디오가 있었다면 즉시 인식 실행
        if (audio && audio instanceof Float32Array) {
            runRecognition(audio, language);
        }
    } catch (err) {
        console.error("❌ 워커 초기화 에러:", err);
        self.postMessage({ status: 'error', message: '엔진 구동 실패' });
        isInitializing = false;
    }
}

// 분석 로직 분리
async function runRecognition(audio, language) {
    try {
        if (!audio || !(audio instanceof Float32Array)) {
            console.warn("⚠️ 유효하지 않은 오디오 데이터입니다.");
            return;
        }

        const output = await transcriber(audio, {
            language: language,
            task: 'transcribe',
            chunk_length_s: 1,
            stride_length_s: 0,
            return_timestamps: false,
            force_full_sequences: false,
        });

        const resultText = Array.isArray(output) ? output[0].text : output.text;
        if (resultText && resultText.trim().length > 0) {
            self.postMessage({ status: 'result', data: resultText });
        }
    } catch (err) {
        console.error("Recognition Error:", err);
        self.postMessage({ status: 'error', message: '인식 중 오류가 발생했지만 엔진은 살아있어요!' });
    }
}