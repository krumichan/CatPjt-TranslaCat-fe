import assert from "node:assert/strict";
import test from "node:test";
import { novelTargetLanguage, novelTranslation, supportsNovelTranslation, withNovelTarget } from "../../src/features/novel/translationLanguage.ts";
import { novelDisplayRows } from "../../src/features/novel/localeText.ts";
import { acceptSnapshot, parseReaderSnapshot, planReading } from "../../src/features/novel/readerModel.ts";
import { completedRepair, continuousReadingPlan } from "../../src/features/novel/recovery.ts";
import { sameReaderPresentation, translationProgress } from "../../src/features/novel/readerMetrics.ts";
import { acceptCatalog, catalogSelectorKey, parseCatalog } from "../../src/features/novel/catalog.ts";
import { NovelPlayback } from "../../src/features/novel/playback.ts";
import { recentNovelEnglishText } from "../../src/features/novel/recentView.ts";
import { getRecentViewLink } from "../../src/utils/routerHelper.ts";

const unit = (target = "en", translatedText = "A cat") => ({ rawJa: "猫", ja: "猫", ko: target === "ko" ? "고양이" : null, targetLanguage: target, translatedText });
const segment = (id, order, status = "SUCCEEDED") => ({ id, order, paragraphId: `p${order}`, paragraphIndex: order,
    startOffset: 0, endOffset: 2, rawJa: "猫。", plainJa: "猫。", ko: null, translatedText: status === "SUCCEEDED" ? `Cat ${id}.` : null,
    targetLanguage: "en", status, errorCode: status === "FAILED" ? "PROVIDER_TIMEOUT" : null });
const snapshot = () => ({ revision: "r1", segmentationVersion: "v1", targetLanguage: "en", title: unit(), pagerInfo: null,
    segments: [segment("a", 0), segment("b", 1)], totalSegments: 2, completedSegments: 2,
    state: "SUCCEEDED", jobId: "en-job", eventSequence: 2, durableComplete: true });
const catalog = () => ({ snapshotId: "en-catalog", eventSequence: 1, state: "SUCCEEDED", total: 1, ready: 1, failed: 0, pageInfo: null,
    selector: { kind: "SEARCH", keyword: "cat", page: 1, language: "en" }, items: [{ itemId: "i1", identifier: "n1", rank: null,
        sourcePosition: 0, arrivalSequence: 0, status: "READY", title: unit(), author: unit(), synopsis: unit(), statusText: unit(),
        genreText: "", isShortStory: false, cached: true, errorCode: null }] });

test("소설 target은 기존 ko를 기본으로 하고 필터와 함께 URL에 유지한다", () => {
    // 준비 / 실행 / 검증
    assert.equal(novelTargetLanguage(null), "ko");
    assert.equal(novelTargetLanguage("ja"), "ko");
    assert.equal(novelTargetLanguage("en"), "en");
    assert.equal(supportsNovelTranslation("syosetu"), true);
    assert.equal(supportsNovelTranslation("SYOSYETU"), true);
    assert.equal(supportsNovelTranslation("kakuyomu"), false);
    assert.equal(withNovelTarget("/novel?page=2&keyword=cat", "en"), "/novel?page=2&keyword=cat&novelTarget=en");
    assert.equal(withNovelTarget("/novel?page=2&novelTarget=en", "ko"), "/novel?page=2");
});

test("영어 표시는 UI locale과 독립적이고 한국어 값은 영어 fallback이 아니다", () => {
    // 준비
    const english = unit();
    const legacy = { rawJa: "猫", ja: "猫", ko: "고양이" };

    // 실행 / 검증
    assert.deepEqual(novelDisplayRows(english, "ja", "en"), [{ language: "en", content: "A cat" }]);
    assert.deepEqual(novelDisplayRows(english, "learning", "en"), [{ language: "ja", content: "猫" }, { language: "en", content: "A cat" }]);
    assert.deepEqual(novelDisplayRows(legacy, "ko", "en"), [{ language: "ja", content: "猫" }]);
    assert.equal(novelTranslation(legacy, "en"), null);
    assert.equal(novelTranslation(legacy), "고양이");
    assert.equal(novelTranslation(english, "ko"), null);
});

test("언어 태그가 없는 generic 번역도 영어로 추정하지 않는다", () => {
    // 준비: 구 캐시에 generic 필드만 추가돼 실제 target을 알 수 없는 경우다.
    const unknown = { rawJa: "猫", ja: "猫", ko: "고양이", translatedText: "언어 미확인" };

    // 실행 / 검증: ko 구 계약만 허용하고 영어는 원문으로 돌아간다.
    assert.equal(novelTranslation(unknown, "en"), null);
    assert.deepEqual(novelDisplayRows(unknown, "learning", "en"), [{ language: "ja", content: "猫" }]);
    assert.equal(novelTranslation(unknown, "ko"), "언어 미확인");
});

test("reader 영어 완료 계약은 generic 번역을 요구하며 ko 작업을 거절한다", () => {
    // 준비
    const value = snapshot();

    // 실행 / 검증
    assert.equal(parseReaderSnapshot(value, "en").completedSegments, 2);
    assert.equal(parseReaderSnapshot({ ...value, segments: value.segments.map(item => ({ ...item, targetLanguage: undefined })) }, "en").completedSegments, 2);
    assert.throws(() => parseReaderSnapshot(value, "ko"), /INVALID_TRANSLATION_TARGET/);
    assert.throws(() => parseReaderSnapshot({ ...value, targetLanguage: undefined }, "en"), /INVALID_TRANSLATION_TARGET/);
    assert.throws(() => parseReaderSnapshot({ ...value, segments: [{ ...value.segments[0], translatedText: null }, value.segments[1]] }, "en"), /EMPTY_TRANSLATION/);
    assert.throws(() => parseReaderSnapshot({ ...value, segments: [{ ...value.segments[0], ko: "고양이" }, value.segments[1]] }, "en"), /INVALID_TRANSLATION_TARGET/);
});

test("동일 revision의 다른 target 결과와 확정 영어 변경은 반영하지 않는다", () => {
    // 준비
    const current = parseReaderSnapshot(snapshot(), "en");
    const korean = { ...current, targetLanguage: "ko", segments: current.segments.map(item => ({ ...item, ko: "고양이", translatedText: "고양이", targetLanguage: "ko" })) };

    // 실행 / 검증
    assert.equal(acceptSnapshot(current, korean, true), false);
    assert.equal(sameReaderPresentation(current, korean), false);
    assert.equal(acceptSnapshot(current, { ...current, segments: [{ ...current.segments[0], translatedText: "Changed" }, current.segments[1]] }), false);
});

test("영어 낭독과 진행률은 영어 gap에서 기다리고 ko로 준비 상태를 보충하지 않는다", () => {
    // 준비
    const value = { ...snapshot(), segments: [segment("a", 0), { ...segment("b", 1, "FAILED"), ko: "다른 언어" }], completedSegments: 1, state: "PARTIAL", durableComplete: false };

    // 실행
    const plan = continuousReadingPlan(value, "all", "en");
    const progress = translationProgress(value.segments, "en");

    // 검증
    assert.deepEqual(plan.queue.map(item => item.id), ["a"]);
    assert.equal(plan.awaitingMore, true);
    assert.equal(progress.ratio, 0.5);
    assert.equal(progress.translatedPrefixChars, 6);
    assert.throws(() => continuousReadingPlan(value, "all", "ko"), /INVALID_TRANSLATION_TARGET/);
    assert.throws(() => planReading(value.segments, "all", "en"), /TRANSLATION_NOT_READY/);
});

test("영어 복구는 현재 target의 committed 번역으로만 완료한다", () => {
    // 준비
    const value = { ...snapshot(), recovery: { traceId: "repair", committedIds: ["b"] } };

    // 실행 / 검증
    assert.equal(completedRepair(value, "repair", ["b"]), true);
    assert.equal(completedRepair({ ...value, segments: [value.segments[0], { ...value.segments[1], translatedText: null, ko: "이전 번역" }] }, "repair", ["b"]), false);
});

test("catalog의 영어 selector·metadata·cache는 한국어와 혼합하지 않는다", () => {
    // 준비
    const current = parseCatalog(catalog());
    const korean = { ...current, selector: { ...current.selector, language: "ko" } };

    // 실행 / 검증
    assert.notEqual(catalogSelectorKey(current.selector), catalogSelectorKey(korean.selector));
    assert.equal(acceptCatalog(current, korean), false);
    const wrong = catalog();
    wrong.items[0].title = unit("ko");
    assert.throws(() => parseCatalog(wrong), /INVALID_TRANSLATION_TARGET/);
});

test("같은 문장 음성도 ko와 en 캐시가 분리되고 늦은 ko 응답은 재생되지 않는다", async () => {
    // 준비: 네트워크가 abort 이후에도 응답하는 경우를 재현한다.
    const calls = [], audios = [], states = [];
    let deliverKorean;
    const piece = { blob: new Blob(["wav"]), partCount: 1 };
    const player = new NovelPlayback({
        fetchAudio: (id, language, part, signal) => {
            calls.push({ id, language, part, signal });
            return language === "ko" ? new Promise(resolve => { deliverKorean = resolve; }) : Promise.resolve(piece);
        },
        now: () => 1, createUrl: () => "blob:audio", revokeUrl() {}, onChange: state => states.push(state),
        createAudio: () => {
            const audio = { duration: 10, currentTime: 0, play: async () => audio.onplaying?.(), pause() {}, load() {}, removeAttribute() {} };
            audios.push(audio);
            return audio;
        },
    });

    // 실행: ko의 미완료 요청을 남겨 두고 같은 ID의 영어를 시작한다.
    player.start([{ ...segment("a", 0), ko: "고양이", translatedText: "고양이", targetLanguage: "ko" }], "ko");
    player.start([segment("a", 0)], "en");
    await new Promise(resolve => setImmediate(resolve));
    deliverKorean(piece);
    await new Promise(resolve => setImmediate(resolve));

    // 검증: 영어만 재생되며 새 영어 텍스트는 같은 ID에서도 새 음성을 요청한다.
    assert.equal(calls[0].signal.aborted, true);
    assert.deepEqual(calls.map(item => item.language), ["ko", "en"]);
    assert.equal(audios.length, 1);
    assert.equal(states.at(-1).status, "playing");
    player.start([{ ...segment("a", 0), translatedText: "A different cat." }], "en");
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(calls.map(item => item.language), ["ko", "en", "en"]);
    player.dispose();
});

test("영어 최근 방문은 영어 제목 또는 원문과 target을 복원하고 기존 ko 제목을 보존한다", () => {
    // 준비: 같은 행에 양쪽 제목이 저장돼 있어도 마지막 방문 언어로 표시·이동한다.
    const recent = { platformCode: "syosyetu", novelId: "n1", episodeId: "2", type: "NOVEL", title: unit("ko"),
        targetLanguage: "en", titleEn: "English title" };

    // 실행 / 검증
    assert.deepEqual(novelDisplayRows(recentNovelEnglishText(recent), "ko", "en"), [{ language: "en", content: "English title" }]);
    assert.deepEqual(novelDisplayRows(recentNovelEnglishText({ ...recent, titleEn: null }), "ko", "en"), [{ language: "ja", content: "猫" }]);
    for (const type of ["NOVEL", "EPISODE", "SHORT"]) {
        assert.match(getRecentViewLink({ ...recent, type }), /\?novelTarget=en$/);
        assert.doesNotMatch(getRecentViewLink({ ...recent, type, targetLanguage: undefined }), /novelTarget/);
    }
    assert.equal(recent.title.ko, "고양이");
});
