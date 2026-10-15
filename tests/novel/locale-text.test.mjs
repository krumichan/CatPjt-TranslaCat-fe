import assert from 'node:assert/strict';
import test from 'node:test';
import { novelDisplayRows } from '../../src/features/novel/localeText.ts';

test('소설 KRJP는 ruby 원문 뒤에 한국어를 표시하고 단일 언어는 선택한 언어만 표시한다', () => {
    // 준비: BE가 만든 ruby와 원문, 번역을 서로 다른 계약 값으로 둔다.
    const value = { rawJa: '猫が来た', ja: '<ruby>猫<rt>ねこ</rt></ruby>が来た', ko: '고양이가 왔다' };

    // 실행
    const learning = novelDisplayRows(value, 'learning');
    const japanese = novelDisplayRows(value, 'ja');
    const korean = novelDisplayRows(value, 'ko');

    // 검증: KRJP에서도 요미가나가 들어간 ja 필드를 버리지 않는다.
    assert.deepEqual(learning, [{ language: 'ja', content: value.ja }, { language: 'ko', content: value.ko }]);
    assert.deepEqual(japanese, [{ language: 'ja', content: value.ja }]);
    assert.deepEqual(korean, [{ language: 'ko', content: value.ko }]);
});

test('번역이 없는 카드와 목록도 ruby 원문을 표시한다', () => {
    // 준비
    const value = { rawJa: '花', ja: '<ruby>花<rt>はな</rt></ruby>', ko: null };

    // 실행 / 검증
    assert.deepEqual(novelDisplayRows(value, 'learning'), [{ language: 'ja', content: value.ja }]);
    assert.deepEqual(novelDisplayRows(value, 'ko'), [{ language: 'ja', content: value.ja }]);
    assert.deepEqual(novelDisplayRows({ ...value, ja: '' }, 'ja'), [{ language: 'ja', content: value.rawJa }]);
});
