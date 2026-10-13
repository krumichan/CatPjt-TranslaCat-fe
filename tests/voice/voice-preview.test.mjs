import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceLiveReducer, INITIAL_VOICE_LIVE_STATE } from '../../src/features/voice/session/voiceLiveReducer.ts';

const update = (state, event) => voiceLiveReducer(state, { type: 'EVENT', event });
const partial = (overrides = {}) => ({
    type: 'TRANSCRIPT_PARTIAL', channel: 'REMOTE', utteranceKey: 'REMOTE-1', utteranceSequence: 1,
    revision: 1, sourceText: 'The shipment arrives', translatedText: '배송이 도착합니다', ...overrides,
});

test('임시 원문·번역은 누적 스냅샷이며 낮거나 같은 revision은 무시한다', () => {
    // 준비
    const initial = update(INITIAL_VOICE_LIVE_STATE, partial({ revision: 3 }));

    // 실행 / 검증: 중복·역순·구형 partial이 현재 스냅샷을 덮어쓰지 않는다.
    for (const revision of [1, 3, undefined, 0, -1, 1.5]) {
        assert.equal(update(initial, partial({ revision, sourceText: 'stale', translatedText: '늦은 번역' })), initial);
    }
    const corrected = update(initial, partial({ revision: 4, sourceText: 'The shipment arrives tomorrow', translatedText: '배송은 내일 도착합니다' }));
    assert.equal(corrected.previews.length, 1);
    assert.equal(corrected.previews[0].sourceText, 'The shipment arrives tomorrow');
    assert.equal(corrected.previews[0].translatedText, '배송은 내일 도착합니다');
    assert.equal(corrected.segments.length, 0);

    // 실행 / 검증: 새 원문에 번역이 없으면 이전 문장의 번역을 붙여 놓지 않는다.
    const sourceOnly = update(corrected, partial({ revision: 5, sourceText: 'The shipment arrives on Friday', translatedText: undefined }));
    assert.equal(sourceOnly.previews[0].translatedText, null);
});

test('확정 원문은 임시 번역을 제거하고 완료 결과가 원문·번역을 함께 교체한다', () => {
    // 준비
    let state = update(INITIAL_VOICE_LIVE_STATE, partial({ revision: 10 }));

    // 실행: 확정 원문은 preview revision과 관계없이 권한을 가지며 이후 partial을 차단한다.
    state = update(state, partial({ type: 'TRANSCRIPT_FINAL', revision: 1, sourceText: 'The shipment arrives Friday' }));
    assert.equal(state.previews.length, 0);
    assert.equal(state.segments[0].translatedText, null);
    assert.equal(update(state, partial({ revision: 11 })), state);
    state = update(state, partial({ type: 'VOICE_PIPELINE_COMPLETED', revision: 2, sourceText: 'The shipment arrives on Friday.', translatedText: '배송은 금요일에 도착합니다.' }));

    // 검증: 완료 뒤 늦은 확정 원문도 최종 결과를 덮어쓰지 않는다.
    assert.equal(state.segments[0].sourceText, 'The shipment arrives on Friday.');
    assert.equal(state.segments[0].translatedText, '배송은 금요일에 도착합니다.');
    assert.equal(state.segments[0].completed, true);
    const lateFinal = update(state, partial({ type: 'TRANSCRIPT_FINAL', translatedText: undefined }));
    assert.deepEqual(lateFinal.segments, state.segments);
    assert.equal(update(state, partial({ revision: 12 })), state);
});

test('다음 발화와 두 채널이 동시에 진행되어도 앞 발화의 임시 번역은 해당 카드만 갱신한다', () => {
    // 준비: 원문 확정이 늦어져 두 발화가 잠시 같은 채널에 남아 있다.
    let state = update(INITIAL_VOICE_LIVE_STATE, partial());
    state = update(state, partial({ channel: 'SELF', utteranceKey: 'SELF-1', sourceText: 'My answer', translatedText: '내 답변' }));
    state = update(state, partial({ type: 'SPEECH_STARTED', utteranceKey: 'REMOTE-2', utteranceSequence: 2, revision: undefined }));

    // 실행: 이전 발화의 번역과 다른 채널의 확정이 현재 발화와 엇갈린다.
    state = update(state, partial({ revision: 2, translatedText: '수정된 배송 안내' }));
    state = update(state, partial({ channel: 'SELF', utteranceKey: 'SELF-1', type: 'VOICE_PIPELINE_COMPLETED', translatedText: '확정된 답변' }));

    // 검증
    assert.equal(state.previews.length, 2);
    assert.equal(state.previews[0].translatedText, '수정된 배송 안내');
    assert.equal(state.partialUtterances.REMOTE.sequence, 2);
    assert.equal(state.partials.REMOTE, '');
    assert.equal(state.listening.REMOTE, true);
    assert.equal(state.segments[0].translatedText, '확정된 답변');
    state = update(state, partial({ type: 'TRANSCRIPT_FINAL', translatedText: undefined }));
    assert.equal(state.previews.length, 1);
    assert.equal(state.previews[0].utteranceSequence, 2);
});

test('무음·언어 거절·실패는 임시 번역을 남기거나 늦은 partial로 되살리지 않는다', () => {
    // 준비 / 실행: 확정 이전에 종료될 수 있는 경계를 모두 통과한다.
    for (const type of ['NO_SPEECH', 'VOICE_PIPELINE_FAILED']) {
        let state = update(INITIAL_VOICE_LIVE_STATE, partial());
        state = update(state, partial({ type, translatedText: undefined,
            error: { code: 'VOICE_AI_LANGUAGE_MISMATCH', stage: 'LANGUAGE' } }));

        // 검증
        assert.equal(state.previews.length, 0);
        assert.equal(state.listening.REMOTE, false);
        assert.equal(update(state, partial({ revision: 2 })), state);
        if (type === 'NO_SPEECH') assert.equal(state.segments.length, 0);
        else assert.equal(state.segments[0].translatedText, null);
    }
});

test('발화 식별자가 없는 무음은 현재의 식별된 임시 카드를 지우지 않는다', () => {
    // 준비: 두 채널 모두 현재 발화에 연결된 임시 원문·번역을 표시한다.
    let state = update(INITIAL_VOICE_LIVE_STATE, partial());
    state = update(state, partial({ channel: 'SELF', utteranceKey: 'SELF-1' }));

    // 실행: 어느 발화에도 연결되지 않은 무음 안내가 뒤늦게 도착한다.
    const result = update(state, { type: 'NO_SPEECH', channel: 'REMOTE' });

    // 검증: 카드와 현재 발화 소유권을 함께 보존하며 다른 채널도 건드리지 않는다.
    assert.deepEqual(result.previews, state.previews);
    assert.deepEqual(result.partials, state.partials);
    assert.deepEqual(result.partialUtterances, state.partialUtterances);
    assert.deepEqual(result.listening, state.listening);
});

test('종료·재접속은 채널의 임시 카드만 정리하고 마지막 확정 결과를 계속 받는다', () => {
    // 준비
    let state = update(INITIAL_VOICE_LIVE_STATE, partial());
    state = update(state, partial({ channel: 'SELF', utteranceKey: 'SELF-1' }));

    // 실행: 입력 종료 직후 임시 표시를 정리하고 drain 중 최종 결과를 받는다.
    state = voiceLiveReducer(state, { type: 'CHANNEL_STATE', channel: 'REMOTE', state: 'DISCONNECTED' });
    assert.deepEqual(state.previews.map(item => item.channel), ['SELF']);
    state = update(state, partial({ type: 'VOICE_PIPELINE_COMPLETED', translatedText: '마지막 확정 결과' }));
    state = voiceLiveReducer(state, { type: 'CHANNEL_STATE', channel: 'REMOTE', state: 'RECONNECTING' });
    state = update(state, partial({ utteranceKey: 'REMOTE-2', utteranceSequence: 2 }));

    // 검증: 새 연결의 임시 결과와 기존 완료 행은 독립적이며 초기화하면 모두 비워진다.
    assert.equal(state.previews.length, 2);
    assert.equal(state.segments[0].translatedText, '마지막 확정 결과');
    assert.equal(voiceLiveReducer(state, { type: 'RESET' }), INITIAL_VOICE_LIVE_STATE);
});
