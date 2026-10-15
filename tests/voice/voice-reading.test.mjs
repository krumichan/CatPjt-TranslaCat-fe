import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(
    new URL("../../src/components/voice/common/VoiceReadingText.tsx", import.meta.url),
    "utf8",
);
const compiled = ts.transpileModule(source, {
    compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
    },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
        assert.equal(name, "react/jsx-runtime");
        return require(name);
    },
});

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const render = (text, tokens) => renderToStaticMarkup(
    React.createElement(exports.VoiceReadingText, { text, tokens }),
);

test("일본어 읽기 토큰은 루비를 표시하면서 공백·줄바꿈·문장부호를 보존한다", () => {
    // 준비: 스다치가 원문 전체를 순서대로 분해하고 공백을 별도 토큰으로 돌려준다.
    const text = "日本 語。\n次";
    const tokens = [
        { surface: "日本", reading: "にほん" },
        { surface: " ", reading: " " },
        { surface: "語", reading: "ご" },
        { surface: "。" },
        { surface: "\n" },
        { surface: "次", reading: "つぎ" },
    ];

    // 실행
    const markup = render(text, tokens);

    // 검증: 공백 토큰을 버리거나 루비로 만들지 않고 표시 가능한 형태로 보존한다.
    assert.match(markup, /class="whitespace-pre-wrap" lang="ja"/);
    assert.match(markup, /<ruby>日本<rp>\(<\/rp><rt>にほん<\/rt><rp>\)<\/rp><\/ruby>/);
    assert.match(markup, /<span> <\/span>/);
    assert.match(markup, /<span>。<\/span><span>\n<\/span>/);
    assert.match(markup, /<ruby>次<rp>\(<\/rp><rt>つぎ<\/rt><rp>\)<\/rp><\/ruby>/);
});

test("빠진 공백이나 빈 읽기 토큰은 원문 전체로 안전하게 대체한다", () => {
    // 준비: 저장된 구형 토큰이 원문의 중간 공백을 누락한 경우도 다룬다.
    const text = "日本 語";
    const incomplete = [
        { surface: "日本", reading: "にほん" },
        { surface: "語", reading: "ご" },
    ];

    // 실행
    const mismatched = render(text, incomplete);
    const empty = render(text, []);

    // 검증: 어느 경우든 글자를 잃지 않고 원문을 그대로 표시한다.
    assert.equal(mismatched, '<span class="whitespace-pre-wrap">日本 語</span>');
    assert.equal(empty, '<span class="whitespace-pre-wrap">日本 語</span>');
});
