import assert from "node:assert/strict";
import { test } from "node:test";

import {
    hasWebAiEffectiveKeywords,
    hasWebAiLanguageSettings,
} from "../../src/features/language-learning/web-ai/webAiPrerequisites.ts";

test("저장 전 기본값과 예약 언어만으로 계획 준비를 완료하지 않는다", () => {
    // 준비
    const setting = { configured: false, originLanguage: "ko", learningLanguage: "ja" };

    // 실행 / 검증
    assert.equal(hasWebAiLanguageSettings(null), false);
    assert.equal(hasWebAiLanguageSettings(setting), false);
    assert.equal(hasWebAiLanguageSettings({ ...setting, configured: true, originLanguage: null, pendingOriginLanguage: "ko" }), false);
    assert.equal(hasWebAiLanguageSettings({ ...setting, configured: true, learningLanguage: "  " }), false);
    assert.equal(hasWebAiLanguageSettings({ ...setting, configured: true }), true);
});

test("유효 키워드가 없으면 등록·적용 예정 키워드만으로 준비를 완료하지 않는다", () => {
    // 준비
    const pendingOnly = { candidates: [], pendingKeywords: [{ text: "요건정의", pendingEffectiveDate: "2099-01-01" }] };

    // 실행 / 검증
    assert.equal(hasWebAiEffectiveKeywords(null), false);
    assert.equal(hasWebAiEffectiveKeywords(pendingOnly), false);
    assert.equal(hasWebAiEffectiveKeywords({ candidates: [{ key: "SYSTEM:1", text: "요건정의", canonicalKey: "requirements" }] }), true);
});
