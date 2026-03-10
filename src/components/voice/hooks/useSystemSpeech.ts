import {BasicSpeechProps} from "@/components/voice/types";
import {useCallback, useEffect, useRef, useState} from "react";
import {useSpeechBase} from "@/components/voice/hooks/useSpeechBase";

export const useSystemSpeech = (props: BasicSpeechProps) => {
    const base = useSpeechBase(props);

    const streamRef = useRef<MediaStream | null>(null);
    const workerRef = useRef<Worker | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const audioBufferRef = useRef<Float32Array[]>([]);
    const totalSamplesRef = useRef<number>(0);
    const isProcessingRef = useRef(false);
    const [isEngineReady, setIsEngineReady] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);

    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const getRMS = (buffer: Float32Array) => {
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i] * buffer[i];
        }
        return Math.sqrt(sum / buffer.length);
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && props.mounted && !workerRef.current) {
            console.log("👷 워커 스레드 생성 중...");
            try {
                const worker = new Worker('/workers/whisper-worker.js', {type: 'module'});
                workerRef.current = worker;

                worker.onmessage = (e) => {
                    const { status, progress, message, data } = e.data;

                    if (status === 'loading') {
                        setIsEngineReady(false);
                        // base를 직접 참조하지 않고 내부 setter만 호출하여 의존성 문제 회피
                        base.setError(message);
                    }
                    if (status === 'progress') {
                        setLoadingProgress(progress);
                    }
                    if (status === 'ready') {
                        setIsEngineReady(true);
                        setLoadingProgress(100);
                        base.setError("");
                    }
                    if (status === 'result') {
                        base.setJapaneseText(data);
                        if (data.trim().length > 0) {
                            base.sendToBackend(data);
                        }
                    }
                    if (status === 'error') {
                        setIsEngineReady(false);
                        base.setError(message);
                    }
                };

                // 엔진 초기화 신호 딱 한 번만 전송
                worker.postMessage({ type: 'init' });

            } catch (err) {
                console.error("Worker initialization failed:", err);
            }
        }

        // cleanup 함수에서 null 처리를 확실히 해서 중복 생성 방지
        return () => {
            // HMR 시에도 워커가 완전히 죽지 않는 경우가 있어 체크 필요
        };
    }, [props.mounted]);

    const startCapture = async () => {
        if (!isEngineReady) {
            return;
        }

        isProcessingRef.current = true;
        base.setIsListening(true);

        try {
            base.resetStatus();

            // 시스템 오디오 캡처
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: { echoCancellation: false }
            });
            streamRef.current = stream;

            // 1. AudioContext 생성 (16000Hz 고정)
            const audioContext = new AudioContext({ sampleRate: 16000 });

            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            audioContextRef.current = audioContext;

            // 2. 워크렛 모듈 로드
            await audioContext.audioWorklet.addModule('/workers/audio-processor.js');

            const source = audioContext.createMediaStreamSource(stream);

            // 3. AudioWorkletNode 생성 (deprecated 된 ScriptProcessor 대체)
            const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');

            // 4. 워크렛에서 온 데이터를 위스퍼 워커로 전달
            workletNode.port.onmessage = (e) => {
                if (!isProcessingRef.current || !isEngineReady) {
                    return;
                }

                const inputData = e.data;
                const rms = getRMS(inputData);

                // 1. 데이터 저장
                audioBufferRef.current.push(inputData);
                totalSamplesRef.current += inputData.length;

                // 2. 침묵 감지 로직
                const THRESHOLD = 0.01;
                const MAX_BUFFER_SIZE = 16000 * 4;
                if (rms < THRESHOLD) {
                    // 소리가 작으면 타이머 가동 (0.8초 동안 조용하면 보냄)
                    if (!silenceTimerRef.current) {
                        silenceTimerRef.current = setTimeout(() => {
                            if (totalSamplesRef.current >= MAX_BUFFER_SIZE || rms < THRESHOLD) {
                                sendBufferToWorker();
                            }
                        }, 800);
                    }
                } else {
                    // 소리가 다시 커지면 타이머 리셋
                    if (silenceTimerRef.current) {
                        clearTimeout(silenceTimerRef.current);
                        silenceTimerRef.current = null;
                    }
                }

                // 3. 안전장치: 10초(160,000 샘플) 넘으면 무조건 보냄
                if (totalSamplesRef.current >= 160000) {
                    sendBufferToWorker();
                }
            };

            // 버퍼 전송 함수 내부 분리
            const sendBufferToWorker = () => {
                if (totalSamplesRef.current < 8000) return; // 너무 짧으면(0.5초 미만) 무시

                const mergedBuffer = new Float32Array(totalSamplesRef.current);
                let offset = 0;
                for (const chunk of audioBufferRef.current) {
                    mergedBuffer.set(chunk, offset);
                    offset += chunk.length;
                }

                workerRef.current?.postMessage({
                    audio: mergedBuffer,
                    language: 'japanese'
                });

                audioBufferRef.current = [];
                totalSamplesRef.current = 0;
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                }
            };

            source.connect(workletNode);
            workletNode.connect(audioContext.destination);

        } catch (err) {
            console.error(err);
            base.setError("시스템 오디오 권한이 필요합니다.");
        }
    };

    const stopCapture = useCallback(() => {
        isProcessingRef.current = false;

        // 1. 스트림 및 오디오 컨텍스트 종료
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }

        // 2. [핵심] 워커를 종료하고 초기화 (쌓인 메시지 큐 통째로 날리기)
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
            setIsEngineReady(false); // 다시 로딩해야 함
        }

        audioBufferRef.current = [];
        totalSamplesRef.current = 0;
        base.setIsListening(false);
    }, [base]);

    return {
        ...base,
        isEngineReady,
        loadingProgress,
        toggleListening: base.isListening ? stopCapture : startCapture
    };
};