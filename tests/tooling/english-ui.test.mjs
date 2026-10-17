import assert from "node:assert/strict";
import test from "node:test";

import { languageOptions } from "../../src/features/languageCatalog.ts";
import { readerLabels } from "../../src/features/novel/readerLabels.ts";
import { novelUiText } from "../../src/features/novel/uiText.ts";

test("DB language additions appear without adding a translated option or changing the catalog order", () => {
    // 준비: 기존 세 언어 밖의 DB 행과 중복 행을 함께 전달한다.
    const catalog = [{ code: "fr", name: "French" }, { code: "en", name: "English" }, { code: "fr", name: "French" }];

    // 실행: 영어 UI에 별도 fr 메시지 키가 없어도 표준 언어 이름을 사용한다.
    const result = languageOptions(catalog, "en", { en: "English" });

    // 검증: DB 순서·코드는 유지하고 고정된 ko/ja를 임의로 덧붙이지 않는다.
    assert.deepEqual(result, [{ code: "fr", label: "French" }, { code: "en", label: "English" }]);
});

test("nonstandard DB languages use their stored name rather than a missing translation key", () => {
    // 준비 / 실행
    const result = languageOptions([{ code: "custom_language", name: "Custom language" }], "en", {});

    // 검증
    assert.deepEqual(result, [{ code: "custom_language", label: "Custom language" }]);
});

test("a saved language remains visible while the database catalog is unavailable", () => {
    // 준비 / 실행: 로딩 중의 기본 목록에 현재 저장값 fr만 따로 전달한다.
    const result = languageOptions([{ code: "ko", name: "Korean" }], "en", {}, ["fr", "fr"]);

    // 검증: 화면과 폼의 선택 언어가 다르게 보이지 않으며 중복은 추가하지 않는다.
    assert.deepEqual(result, [{ code: "ko", label: "Korean" }, { code: "fr", label: "French" }]);
});

test("English novel controls remain independent of the chosen content language", () => {
    // 준비 / 실행
    const koreanContent = readerLabels("en", "ko");
    const englishContent = readerLabels("en", "en");

    // 검증: UI는 영어이고 번역 대상 이름만 선택에 맞춰 달라진다.
    assert.equal(koreanContent.translation, "Korean translation");
    assert.equal(englishContent.translation, "English translation");
    assert.equal(englishContent.stop, "Stop");
    assert.equal(novelUiText("en").translationLanguage, "Translation language");
    assert.equal(readerLabels("ja").stop, "停止");
    assert.equal(readerLabels("ko").stop, "정지");
});
