import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptCatalog, catalogWorkPath, parseCatalog, orderedCatalogItems } from '../../src/features/novel/catalog.ts';
const text = value => ({ rawJa: value, ja: value, ko: `${value} 번역` });
const item = rank => ({ itemId: `i${rank}`, identifier: `n${rank}`, rank, sourcePosition: rank, status: 'READY', title: text('題'), synopsis: text('紹介'), author: text('人'), statusText: text('連載'), genreText: '', isShortStory: false, arrivalSequence: rank, errorCode: null, cached: false });
const snapshot = items => ({ snapshotId: 's', eventSequence: items.length, state: 'RUNNING', total: 50, ready: items.filter(x => x.status === 'READY').length, failed: items.filter(x => x.status === 'FAILED').length, pageInfo: null, selector: { kind: 'RANKING', period: 'daily', genreId: 'all', keyword: '', page: 1, language: 'ko' }, items });

test('50개를 기다리지 않고 1·7·15·3 완료 순을 유지하며 실제 rank는 바꾸지 않는다', () => {
    // 준비 / 실행: 완료 이벤트를 단계별로 공개한다.
    let previous = null;
    const arrivals = [1, 7, 15, 3];
    for (let size = 1; size <= arrivals.length; size++) {
        const next = parseCatalog(snapshot(arrivals.slice(0, size).map((rank, arrivalSequence) => ({ ...item(rank), arrivalSequence }))));
        assert.equal(previous === null || acceptCatalog(previous, next), true);
        previous = next;
        assert.equal(next.items.length, size);
    }
    // 검증: 기본 append 순과 사용자가 고른 rank 정렬을 분리한다.
    assert.deepEqual(orderedCatalogItems(previous, 'arrival').map(x => x.rank), arrivals);
    assert.deepEqual(orderedCatalogItems(previous, 'source').map(x => x.rank), [1, 3, 7, 15]);
});

test('cache 우선·개별 실패 재시도는 기존 위치와 성공 카드를 보존한다', () => {
    // 준비
    const first = parseCatalog(snapshot([{ ...item(7), arrivalSequence: 0, cached: true }, { ...item(3), arrivalSequence: 1, status: 'FAILED', errorCode: 'PROVIDER_TIMEOUT' }]));
    const retry = structuredClone(first);
    retry.eventSequence++;
    retry.items[1].status = 'READY'; retry.items[1].errorCode = null; retry.ready++; retry.failed--;
    // 실행 / 검증
    assert.equal(acceptCatalog(first, retry), true);
    assert.deepEqual(orderedCatalogItems(retry, 'arrival').map(x => x.identifier), ['n7', 'n3']);
    retry.items[0].title.ko = '교체 금지';
    assert.equal(acceptCatalog(first, retry), false);
});

test('다른 검색·page·snapshot·늦은 cursor 및 중복 ID는 격리한다', () => {
    // 준비 / 실행 / 검증
    const first = parseCatalog(snapshot([item(1)]));
    assert.equal(acceptCatalog(first, { ...first, snapshotId: 'other' }), false);
    assert.equal(acceptCatalog(first, { ...first, eventSequence: 0 }), false);
    assert.equal(acceptCatalog(first, { ...first, selector: { ...first.selector, page: 2 } }), false);
    assert.throws(() => parseCatalog(snapshot([item(1), item(1)])));
});

test('카쿠요무 단편과 연재는 문자열 작품 ID를 보존한 목차로 이동한다', () => {
    // 준비: 카쿠요무 단편은 episode/0 대신 실제 회차 ID 조회가 필요하다.
    const workId = '11054822662896759076';
    const value = snapshot([{ ...item(1), identifier: workId, isShortStory: true }]);

    // 실행
    const parsed = parseCatalog(value);

    // 검증: 화면 파서와 이동 경로에서 큰 숫자 ID의 정밀도를 잃지 않는다.
    assert.equal(parsed.items[0].identifier, workId);
    assert.equal(catalogWorkPath('kakuyomu', workId, true), `/novel/kakuyomu/novels/${workId}`);
    assert.equal(catalogWorkPath('KAKUYOMU', workId, false), `/novel/kakuyomu/novels/${workId}`);
    assert.equal(catalogWorkPath('syosetu', 'n1', true), '/novel/syosetu/novels/n1/episode/0');
    assert.equal(catalogWorkPath('syosyetu', 'n1', false), '/novel/syosyetu/novels/n1');
});
