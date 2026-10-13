import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareVoiceMedia } from '../../src/features/voice/audio/voiceMedia.ts';
import { startVoiceAudioCapture } from '../../src/features/voice/audio/voiceAudioCapture.ts';
import { VoiceInputMonitor } from '../../src/features/voice/audio/voiceInputMonitor.ts';
import { voiceErrorMessageKey, isVoiceLanguageRejection } from '../../src/features/voice/session/voiceErrorMessage.ts';
import { voiceLiveReducer, INITIAL_VOICE_LIVE_STATE } from '../../src/features/voice/session/voiceLiveReducer.ts';

test('이력은 stage 없이도 번역 실패를 구분하고 다른 처리 실패를 오분류하지 않는다', () => {
    // 준비 / 실행: 이력 DTO에는 오류 코드만 있으며 실시간 이벤트는 stage도 제공한다.
    const timeout = voiceErrorMessageKey('VOICE_AI_TRANSLATION_TIMEOUT');
    const failed = voiceErrorMessageKey('VOICE_AI_TRANSLATION_FAILED');
    const sttFailure = voiceErrorMessageKey('VOICE_AI_STT_TIMEOUT');
    const unknownFailure = voiceErrorMessageKey('VOICE_AI_UNKNOWN');

    // 검증: 번역 원문을 재사용할 수 있는 오류에 다시 발화하라는 안내를 표시하지 않는다.
    assert.equal(timeout, 'live.translationFailed');
    assert.equal(failed, 'live.translationFailed');
    assert.equal(sttFailure, 'live.recognitionTimeout');
    assert.equal(unknownFailure, 'live.processingFailed');
    assert.equal(voiceErrorMessageKey('OTHER', 'TRANSLATION'), 'live.translationFailed');
    assert.equal(voiceErrorMessageKey('VOICE_AI_UNSUPPORTED_LANGUAGE'), 'live.unsupportedLanguage');
});

test('서버의 인식 지연·과부하와 입력 오류는 실시간·이력에서 같은 원인으로 안내한다', () => {
    // 준비: 이력에는 stage가 없으므로 코드만으로도 같은 안내를 선택해야 한다.
    const cases = [
        ['VOICE_AI_STT_TIMEOUT', 'STT', 'live.recognitionTimeout'],
        ['VOICE_AI_BACKPRESSURE', 'STT', 'live.serverBusy'],
        ['VOICE_BE_BACKPRESSURE', 'STREAM', 'live.serverBusy'],
        ['VOICE_BACKPRESSURE', 'STREAM', 'live.serverBusy'],
        ['VOICE_AI_STT_FAILED', 'STT', 'live.recognitionFailed'],
        ['VOICE_AI_INVALID_AUDIO_FRAME', 'AUDIO', 'live.audioInputFailed'],
        ['VOICE_INVALID_AUDIO_FRAME', 'AUDIO', 'live.audioInputFailed'],
        ['VOICE_AI_UNSUPPORTED_AUDIO_FORMAT', 'AUDIO', 'live.audioInputFailed'],
        ['VOICE_BE_INTERNAL_ERROR', 'STREAM', 'live.serverFailed'],
        ['VOICE_AI_INTERNAL_ERROR', 'RUNTIME', 'live.serverFailed'],
        ['VOICE_AI_MODEL_NOT_READY', 'RUNTIME', 'live.serverFailed'],
    ];

    // 실행 / 검증: 처리 실패를 다시 말하거나 입력 설정을 고치라는 안내로 오분류하지 않는다.
    for (const [code, stage, expected] of cases) {
        assert.equal(voiceErrorMessageKey(code, stage), expected);
        assert.equal(voiceErrorMessageKey(code), expected);
    }
});

test('권한 대기 취소는 즉시 끝나고 늦게 허용된 스트림도 반납한다', async () => {
    // 준비
    let resolveMedia;
    let stopped = 0;
    const pendingMedia = new Promise(resolve => { resolveMedia = resolve; });
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
        mediaDevices: { getUserMedia: () => pendingMedia },
    } });
    const controller = new AbortController();
    const prepared = prepareVoiceMedia('MIC', controller.signal);
    const cancelled = assert.rejects(prepared, { name: 'AbortError' });

    // 실행: 브라우저 권한 창의 응답보다 취소가 먼저 도착한다.
    controller.abort();
    await cancelled;
    resolveMedia({ getTracks: () => [{ stop() { stopped += 1; } }] });
    await new Promise(resolve => setTimeout(resolve, 0));

    // 검증
    assert.equal(stopped, 1);
});

test('입력 미터는 지속 무음과 작은 입력을 구분하고 정상 음성에서 회복한다', () => {
    // 준비 / 실행: 250ms마다 입력 크기를 표시하는 경계를 재현한다.
    const monitor = new VoiceInputMonitor();
    assert.equal(monitor.sample(0).status, 'WAITING');
    assert.equal(monitor.sample(1500).status, 'SILENT');
    monitor.push(new Float32Array(128).fill(0.001));
    assert.equal(monitor.sample(2000).status, 'ACTIVE');
    monitor.push(new Float32Array(128).fill(0.001));
    assert.equal(monitor.sample(3500).status, 'LOW');
    monitor.push(new Float32Array(128).fill(0.1));
    const recovered = monitor.sample(3750);

    // 검증: 미터는 작은 입력을 제거하거나 증폭하지 않고 상태만 알려 준다.
    assert.equal(recovered.status, 'ACTIVE');
    assert.ok(recovered.level > 0 && recovered.level <= 1);
});

function installCaptureMocks(failAt) {
    const track = new EventTarget();
    track.readyState = 'live';
    track.muted = false;
    const contexts = [];
    const processors = [];
    const nodes = [];
    const node = () => {
        const value = { disconnected: 0, connect() {}, disconnect() { this.disconnected += 1; }, gain: { value: 1 } };
        nodes.push(value);
        return value;
    };
    globalThis.MediaStream = class {};
    globalThis.AudioContext = class {
        state = failAt === 'resume' ? 'suspended' : 'running';
        sampleRate = 16000;
        closed = 0;
        destination = {};
        audioWorklet = { addModule: async () => { if (failAt === 'module') throw new Error(failAt); } };
        constructor() { contexts.push(this); }
        async resume() { if (failAt === 'resume') throw new Error(failAt); }
        async close() { this.closed += 1; this.state = 'closed'; }
        createMediaStreamSource() { return node(); }
        createGain() { if (failAt === 'gain') throw new Error(failAt); return node(); }
    };
    globalThis.AudioWorkletNode = class {
        port = { onmessage: null };
        disconnected = 0;
        constructor() { processors.push(this); }
        connect() {}
        disconnect() { this.disconnected += 1; }
    };
    return { track, contexts, processors, nodes, stream: { getAudioTracks: () => [track] } };
}

test('각 초기화 실패 지점에서 AudioContext와 생성된 노드를 정리한다', async () => {
    for (const failAt of ['resume', 'module', 'gain']) {
        // 준비 / 실행
        const mocked = installCaptureMocks(failAt);
        await assert.rejects(startVoiceAudioCapture({ stream: mocked.stream, onFrame() {} }), new RegExp(failAt));

        // 검증
        assert.equal(mocked.contexts[0].closed, 1);
        assert.ok(mocked.nodes.every(node => node.disconnected === 1));
        assert.ok(mocked.processors.every(node => node.disconnected === 1));
    }
});

test('mute·unmute·ended 상태와 종료 뒤 전송 금지를 함께 검증한다', async () => {
    // 준비
    const mocked = installCaptureMocks();
    const activities = [];
    const frames = [];
    const capture = await startVoiceAudioCapture({
        stream: mocked.stream, onFrame: frame => frames.push(frame), onInputActivity: activity => activities.push(activity),
    });
    const processor = mocked.processors[0];

    // 실행 / 검증: 입력 상태는 일시 전송 중지와 독립적으로 유지된다.
    mocked.track.muted = true;
    mocked.track.dispatchEvent(new Event('mute'));
    assert.equal(activities.at(-1).status, 'MUTED');
    mocked.track.muted = false;
    mocked.track.dispatchEvent(new Event('unmute'));
    assert.notEqual(activities.at(-1).status, 'MUTED');
    processor.port.onmessage({ data: new Float32Array(1600).fill(0.1) });
    assert.equal(frames.length, 1);
    capture.pause();
    processor.port.onmessage({ data: new Float32Array(1600) });
    assert.equal(frames.length, 1);
    capture.resume();
    mocked.track.readyState = 'ended';
    mocked.track.dispatchEvent(new Event('ended'));
    assert.equal(activities.at(-1).status, 'ENDED');
    assert.equal(processor.port.onmessage, null);
    assert.equal(mocked.contexts[0].closed, 1);
    await capture.stop();
    assert.equal(mocked.contexts[0].closed, 1);
});

test('언어 정책 오류는 원문·오류 단계를 보존하고 번역 실패와 구분한다', () => {
    // 준비
    const sourceText = 'Bonjour';
    const event = { type: 'VOICE_PIPELINE_FAILED', channel: 'REMOTE', utteranceKey: 'u1', sourceText,
        error: { code: 'VOICE_AI_UNSUPPORTED_LANGUAGE', stage: 'LANGUAGE', retryable: false } };

    // 실행
    const state = voiceLiveReducer(INITIAL_VOICE_LIVE_STATE, { type: 'EVENT', event });

    // 검증
    assert.equal(state.segments[0].sourceText, sourceText);
    assert.equal(state.segments[0].errorStage, 'LANGUAGE');
    assert.equal(voiceErrorMessageKey(event.error.code, 'LANGUAGE'), 'live.unsupportedLanguage');
    assert.equal(voiceErrorMessageKey('VOICE_AI_LANGUAGE_MISMATCH', 'LANGUAGE'), 'live.languageMismatch');
    assert.equal(voiceErrorMessageKey('OTHER', 'LANGUAGE'), 'live.languageFailed');
    assert.equal(isVoiceLanguageRejection(event.error.code), true);
    assert.equal(isVoiceLanguageRejection('VOICE_AI_LANGUAGE_UNDETERMINED'), true);
    assert.equal(voiceErrorMessageKey('VOICE_AI_LANGUAGE_UNDETERMINED'), 'live.languageFailed');
});

test('이전 발화의 늦은 완료·오류·무음은 다음 발화의 partial을 지우지 않는다', () => {
    // 준비
    const partial = { type: 'TRANSCRIPT_PARTIAL', channel: 'REMOTE', utteranceKey: 'next', utteranceSequence: 2, sourceText: 'Next sentence' };
    const state = voiceLiveReducer(INITIAL_VOICE_LIVE_STATE, { type: 'EVENT', event: partial });

    // 실행 / 검증: 순서가 바뀌어 도착하는 모든 종료 이벤트를 확인한다.
    for (const type of ['TRANSCRIPT_FINAL', 'VOICE_PIPELINE_COMPLETED', 'VOICE_PIPELINE_FAILED', 'NO_SPEECH']) {
        const prior = { type, channel: 'REMOTE', utteranceKey: 'previous', utteranceSequence: 1, sourceText: 'Previous sentence' };
        const result = voiceLiveReducer(state, { type: 'EVENT', event: prior });
        assert.equal(result.partials.REMOTE, 'Next sentence');
    }
    const matching = voiceLiveReducer(state, { type: 'EVENT', event: { ...partial, type: 'TRANSCRIPT_FINAL' } });
    assert.equal(matching.partials.REMOTE, '');
    const latePartial = voiceLiveReducer(state, { type: 'EVENT', event: { ...partial, utteranceKey: 'previous', utteranceSequence: 1 } });
    assert.equal(latePartial.partials.REMOTE, 'Next sentence');
});

test('듣는 중인 발화는 같은 번호의 번역 결과로 전환되고 늦은 이전 결과에 지워지지 않는다', () => {
    // 준비: 실제 이벤트 순서대로 음성 시작과 임시 원문을 받는다.
    const started = { type: 'SPEECH_STARTED', channel: 'REMOTE', utteranceKey: 'REMOTE-1', utteranceSequence: 1 };
    const partial = { type: 'TRANSCRIPT_PARTIAL', channel: 'REMOTE', utteranceKey: 'REMOTE-1', utteranceSequence: 1,
        sourceText: 'Current speech' };
    let state = voiceLiveReducer(INITIAL_VOICE_LIVE_STATE, { type: 'EVENT', event: started });
    assert.equal(state.listening.REMOTE, true);
    assert.equal(state.partialUtterances.REMOTE.sequence, 1);
    assert.equal(state.segments.length, 0);

    // 실행: 임시 원문 뒤 확정 원문·번역이 오고, 다음 발화가 곧 시작된다.
    state = voiceLiveReducer(state, { type: 'EVENT', event: partial });
    state = voiceLiveReducer(state, { type: 'EVENT', event: started });
    assert.equal(state.partials.REMOTE, 'Current speech');
    state = voiceLiveReducer(state, { type: 'EVENT', event: { ...partial, type: 'TRANSCRIPT_FINAL' } });
    assert.equal(state.listening.REMOTE, false);
    assert.equal(state.segments[0].sourceText, 'Current speech');
    state = voiceLiveReducer(state, { type: 'EVENT', event: started });
    assert.equal(state.listening.REMOTE, false);
    state = voiceLiveReducer(state, { type: 'EVENT', event: { type: 'SPEECH_STARTED', channel: 'REMOTE',
        utteranceKey: 'REMOTE-2', utteranceSequence: 2 } });
    state = voiceLiveReducer(state, { type: 'EVENT', event: { ...partial, type: 'VOICE_PIPELINE_COMPLETED',
        translatedText: '현재 음성' } });

    // 검증: 늦게 온 1번 번역은 2번의 듣는 중 표시와 소유권을 유지한다.
    assert.equal(state.listening.REMOTE, true);
    assert.equal(state.partialUtterances.REMOTE.sequence, 2);
    assert.equal(state.segments[0].translatedText, '현재 음성');
    state = voiceLiveReducer(state, { type: 'EVENT', event: { type: 'NO_SPEECH', channel: 'REMOTE',
        utteranceKey: 'REMOTE-2', utteranceSequence: 2 } });
    assert.equal(state.listening.REMOTE, false);
});

test('재접속은 미저장 partial 소유권만 지우고 완료 행과 다른 채널을 보존한다', () => {
    // 준비: 저장된 최종 발화는 2번이지만 이전 연결은 미확정 20번까지 진행했다.
    let state = voiceLiveReducer(INITIAL_VOICE_LIVE_STATE, { type: 'EVENT', event: {
        type: 'VOICE_PIPELINE_COMPLETED', channel: 'REMOTE', utteranceKey: 'REMOTE-2', utteranceSequence: 2,
        sourceText: 'Saved sentence', translatedText: '저장된 문장',
    } });
    for (const channel of ['SELF', 'REMOTE']) {
        state = voiceLiveReducer(state, { type: 'EVENT', event: {
            type: 'TRANSCRIPT_PARTIAL', channel, utteranceKey: `${channel}-20`, utteranceSequence: 20,
            sourceText: `${channel} unfinished`,
        } });
    }

    // 실행: 서버는 저장된 마지막 번호 다음인 3번부터 새 연결을 이어 간다.
    const reconnecting = voiceLiveReducer(state, { type: 'CHANNEL_STATE', channel: 'REMOTE', state: 'RECONNECTING' });
    const resumed = voiceLiveReducer(reconnecting, { type: 'EVENT', event: {
        type: 'TRANSCRIPT_PARTIAL', channel: 'REMOTE', utteranceKey: 'REMOTE-3', utteranceSequence: 3,
        sourceText: 'New connection sentence',
    } });

    // 검증: 과거의 높은 미저장 번호가 새 입력을 막지 않는다.
    assert.equal(reconnecting.partials.REMOTE, '');
    assert.equal(reconnecting.partialUtterances.REMOTE, null);
    assert.equal(resumed.partials.REMOTE, 'New connection sentence');
    assert.equal(resumed.partials.SELF, 'SELF unfinished');
    assert.equal(resumed.segments, state.segments);
    assert.equal(resumed.segments[0].translatedText, '저장된 문장');
});
