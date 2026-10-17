import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { readerLabels } from "../../src/features/novel/readerLabels.ts";
import { novelTranslation } from "../../src/features/novel/translationLanguage.ts";

function sourceComponent(name, extra = {}) {
    const file = new URL(`../../src/components/novel/${name}.tsx`, import.meta.url);
    const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const modules = { react: React, "react/jsx-runtime": jsxRuntime,
        "@/features/novel/readerLabels": { readerLabels },
        "@/features/novel/translationLanguage": { novelTranslation }, ...extra };
    const exports = {};
    vm.runInNewContext(compiled, { exports, require: name => {
        assert.ok(name in modules, `Unexpected sentence dependency: ${name}`);
        return modules[name];
    } }, { filename: file.pathname });
    return exports.default;
}

const NovelSourceText = sourceComponent("NovelSourceText");
const NovelSentence = sourceComponent("NovelSentence", { "@/components/novel/NovelSourceText": { default: NovelSourceText } });
const segment = (plainJa, status) => ({ id: "source-position", paragraphId: "p0", order: 0, paragraphIndex: 0,
    startOffset: 0, endOffset: plainJa.length, rawJa: plainJa, plainJa, ko: status === "SUCCEEDED" ? "" : null,
    status, errorCode: status === "FAILED" ? "PROVIDER_TIMEOUT" : null });
const render = (value, view, repairRequested = false) => renderToStaticMarkup(React.createElement(NovelSentence, {
    segment: value, view, locale: "ko", active: false, repair: () => {}, repairRequested,
}));

test("공백·개행 문장은 원문 위치를 유지하고 번역 대기·실패·복구 조작을 표시하지 않는다", () => {
    // 준비: 공백도 canonical 문장 집합에 남지만 유료 번역/복구 대상은 아니다.
    for (const text of ["", " \n", "\t\u3000\n\n"]) {
        for (const status of ["SUCCEEDED", "PENDING", "FAILED"]) {
            for (const view of ["ko", "parallel", "ja"]) {
                for (const repairRequested of [false, true]) {
                    // 실행: 실제 문장/원문 컴포넌트를 React 서버 렌더러로 그린다.
                    const html = render(segment(text, status), view, repairRequested);

                    // 검증: blank 자체와 ID는 남고 주황 상태·불필요한 복구 버튼은 없다.
                    assert.ok(html.includes('data-segment-id="source-position"'));
                    assert.ok(html.includes(`<span lang="ja">${text}</span>`));
                    assert.doesNotMatch(html, /원문 · 번역 대기|번역 실패 · 원문|복구 저장 완료|<button/);
                }
            }
        }
    }
});

test("실제 본문의 미번역·실패 상태와 명시적 문장 복구는 계속 표시한다", () => {
    // 준비
    const pending = segment("猫だ。", "PENDING");
    const failed = segment("猫だ。", "FAILED");

    // 실행
    const pendingHtml = render(pending, "ko");
    const failedHtml = render(failed, "parallel");

    // 검증: blank를 숨기는 수정으로 실제 오류 안내나 복구 기회를 없애지 않는다.
    assert.match(pendingHtml, /猫だ。/);
    assert.match(pendingHtml, /원문 · 번역 대기/);
    assert.doesNotMatch(pendingHtml, /<button/);
    assert.match(failedHtml, /猫だ。/);
    assert.match(failedHtml, /번역 실패 · 원문/);
    assert.match(failedHtml, /<button[^>]*>이 문장 다시 번역<\/button>/);
});
