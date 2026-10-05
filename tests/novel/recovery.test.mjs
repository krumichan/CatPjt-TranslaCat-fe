import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptSnapshot } from '../../src/features/novel/readerModel.ts';
import { recoveryTargets, completedRepair, continuousReadingPlan } from '../../src/features/novel/recovery.ts';

const segment = (id, status = 'SUCCEEDED') => ({ id, rawJa: id, plainJa: id, ko: status === 'SUCCEEDED' ? `${id} 번역` : null, status, errorCode: null });
const snapshot = () => ({ revision: 'r', segmentationVersion: 'v', policyVersion: 'p', glossaryVersion: 'g', jobId: 'j', eventSequence: 1, segments: [segment('a'), segment('b', 'FAILED'), segment('c')], state: 'PARTIAL' });

test('복구 및 늦은 A 응답은 이미 채택한 정상 번역을 바꿀 수 없다', () => {
    // 준비 / 실행 / 검증: 원문과 ID가 같아도 정상 target 교체는 거부한다.
    const original = snapshot();
    const altered = structuredClone(original);
    altered.segments[0].ko = '다른 번역';
    assert.equal(acceptSnapshot(original, altered), false);
    const recovered = structuredClone(original);
    recovered.segments[1] = segment('b');
    assert.equal(acceptSnapshot(original, recovered), true);
    assert.equal(acceptSnapshot(original, { ...original, policyVersion: 'old' }), false);
});

test('실패 gap 앞뒤와 tail을 건너뛰지 않고 연속 재생만 기다린다', () => {
    // 준비 / 실행 / 검증: 완료 뒤쪽 문장이 있어도 첫 실패를 넘어서지 않는다.
    const value = snapshot();
    assert.deepEqual(continuousReadingPlan(value, 'all', 'ko').queue.map(x => x.id), ['a']);
    assert.equal(continuousReadingPlan(value, 'all', 'ko').awaitingMore, true);
    assert.deepEqual(continuousReadingPlan(value, 'from', 'ko', 'b'), { queue: [], awaitingMore: true });
    assert.throws(() => continuousReadingPlan(value, 'single', 'ko', 'b'));
    assert.equal(continuousReadingPlan(value, 'all', 'ja').awaitingMore, false);
});

test('명시 복구 대상만 선택하고 생성 중 PENDING이나 거절을 선발사하지 않는다', () => {
    // 준비: 뒤쪽 정상 문장과 미생성 문장을 함께 보존한다.
    const current = snapshot();
    current.segments.push(segment('d', 'PENDING'), { ...segment('e', 'FAILED'), errorCode: 'PROVIDER_REFUSAL' });
    // 실행 / 검증: 서버 판정 전에 UI도 확정 실패만 명령 후보로 둔다.
    assert.deepEqual(recoveryTargets(current), ['b']);
    assert.deepEqual(recoveryTargets(current, 'a'), []);
    assert.deepEqual(recoveryTargets(current, 'd'), []);
    assert.deepEqual(recoveryTargets(current, 'b'), ['b']);
});

test('복구 완료는 동일 trace의 commit IDs와 정상 결과를 모두 요구한다', () => {
    // 준비 / 실행 / 검증: 낙관적 표시나 다른 복구 job은 완료 계측이 아니다.
    const value = snapshot();
    value.segments[1] = segment('b');
    value.recovery = { repairId: 'repair', state: 'SUCCEEDED', targetIds: ['b'], committedIds: ['b'], traceId: 'trace' };
    assert.equal(completedRepair(value, 'trace', ['b']), true);
    assert.equal(completedRepair(value, 'other', ['b']), false);
    value.recovery.committedIds = [];
    assert.equal(completedRepair(value, 'trace', ['b']), false);
});
