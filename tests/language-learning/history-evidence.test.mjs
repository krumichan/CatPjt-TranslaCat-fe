import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { initialLearningEvidenceFilter, learningEvidenceQuery } from "../../src/features/language-learning/history/evidenceQuery.ts";

test("evidence query preserves explicit dates and encodes a server cursor without owner or generation parameters", () => {
    // 준비
    const filter = { source: "SPEAKING", learningLanguage: " ja ", from: "2026-08-01", to: "2026-09-30", resultKind: "SESSION_COACHING", policyVersion: " coaching/v1 " };

    // 실행
    const query = new URLSearchParams(learningEvidenceQuery(filter, "2026-08-15|SPEAKING:-1+revision"));

    // 검증
    assert.deepEqual(Object.fromEntries(query), {
        from: "2026-08-01", to: "2026-09-30", limit: "25", source: "SPEAKING", learningLanguage: "ja",
        resultKind: "SESSION_COACHING", policyVersion: "coaching/v1", cursor: "2026-08-15|SPEAKING:-1+revision",
    });
});

test("all stored languages and kinds remain unfiltered when optional selectors are empty", () => {
    // 준비
    const filter = initialLearningEvidenceFilter(new Date(2026, 0, 10));

    // 실행
    const query = new URLSearchParams(learningEvidenceQuery(filter, null));

    // 검증: 월/연도 경계를 넘는 조회 창은 평가 주기나 현재 언어로 재해석하지 않는다.
    assert.equal(filter.from, "2025-12-12");
    assert.equal(filter.to, "2026-01-10");
    assert.deepEqual([...query.keys()], ["from", "to", "limit"]);
});

test("all existing locales label scored, coaching, unknown and failure states separately", () => {
    // 준비
    const locales = ["ko", "ja", "learning"].map((locale) => JSON.parse(readFileSync(new URL(`../../messages/${locale}/languageLearning.json`, import.meta.url), "utf8")).LanguageLearning.history.evidence);

    // 검증
    for (const labels of locales) {
        assert.equal(new Set(Object.values(labels.kind)).size, 3);
        assert.notEqual(labels.failed, labels.empty);
        assert.ok(labels.limitation.UNKNOWN_METADATA);
        assert.ok(labels.unavailable);
        assert.ok(labels.reviewReason);
    }
    assert.deepEqual(Object.keys(locales[0]).sort(), Object.keys(locales[1]).sort());
    assert.deepEqual(Object.keys(locales[0]).sort(), Object.keys(locales[2]).sort());
});
