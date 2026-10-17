import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "use-intl/core";
import ts from "typescript";

import { getGuideHelpLocale, getGuideHelpTarget, guideHelpTopics } from "../../src/lib/docs/guideHelp.ts";

test("every contextual help topic resolves to the matching public guide in all three languages", () => {
    // 준비: 실제 문서 파일을 기준으로 도움말 주소와 번역된 제목을 확인한다.
    const root = new URL("../../content/docs/", import.meta.url);

    // 실행 및 검증: 기능 도움말이 전체 목차나 존재하지 않는 문서로 연결되지 않는다.
    for (const topic of Object.keys(guideHelpTopics)) {
        for (const locale of ["ko", "ja", "en"]) {
            const nestedIndex = topic === "index" ? "index" : topic;
            const directFile = new URL(`${nestedIndex}.${locale}.mdx`, root);
            const indexFile = new URL(`${nestedIndex}/index.${locale}.mdx`, root);
            const file = fs.existsSync(directFile) ? directFile : indexFile;
            const source = fs.readFileSync(file, "utf8");
            const title = source.match(/^title:\s*(.+)$/m)?.[1].trim();
            const target = getGuideHelpTarget(topic, locale);
            assert.equal(target.title, title, `${topic}/${locale}`);
            assert.equal(target.href, `/${locale}/docs${topic === "index" ? "" : `/${topic}`}`);
        }
    }
});

test("learning mode keeps the Japanese guide and unsupported display locales use Korean", () => {
    // 준비 / 실행
    const learning = getGuideHelpTarget("account-books/receipt-review", "learning");
    const fallback = getGuideHelpTarget("chat/messages-translation", "fr");

    // 검증: 앱의 기존 가이드 언어 규칙을 유지한다.
    assert.equal(getGuideHelpLocale("learning"), "ja");
    assert.equal(learning.href, "/ja/docs/account-books/receipt-review");
    assert.equal(fallback.href, "/ko/docs/chat/messages-translation");
});

test("help links are accessible native links that open the exact task without submitting a surrounding form", () => {
    // 준비: 실제 컴포넌트를 렌더링하고 사용 중인 번역문으로 접근성 이름을 만든다.
    const source = fs.readFileSync(new URL("../../src/components/common/GuideHelpLink.tsx", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;

    for (const locale of ["ko", "ja", "en", "learning"]) {
        const messages = JSON.parse(fs.readFileSync(new URL(`../../messages/${locale}/common.json`, import.meta.url), "utf8"));
        const translate = createTranslator({ locale: locale === "learning" ? "ja" : locale, messages, namespace: "Common.guideHelp" });
        const modules = {
            "react/jsx-runtime": jsxRuntime,
            "lucide-react": { CircleHelp: (props) => React.createElement("svg", props) },
            "next-intl": { useLocale: () => locale, useTranslations: () => translate },
            "@/lib/docs/guideHelp": { getGuideHelpTarget },
            "@/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
        };
        const exports = {};
        vm.runInNewContext(compiled, { exports, require: (name) => {
            assert.ok(Object.hasOwn(modules, name), `Unexpected dependency: ${name}`);
            return modules[name];
        } });

        // 실행: 저장 폼 안에서도 도움말은 제출 버튼으로 렌더링되지 않는다.
        for (const variant of ["icon", "text"]) {
            const html = renderToStaticMarkup(React.createElement("form", null,
                React.createElement(exports.GuideHelpLink, { topic: "account-books/receipt-upload", variant })));
            const target = getGuideHelpTarget("account-books/receipt-upload", locale);

            // 검증: 기능별 직접 주소와 새 탭 안내를 제공하고 계정·가계부 식별자를 전달하지 않는다.
            assert.ok(html.includes(`href="${target.href}"`));
            assert.match(html, /target="_blank"/);
            assert.match(html, /rel="noopener noreferrer"/);
            assert.match(html, /aria-label="[^"]+"/);
            assert.match(html, /data-guide-topic="account-books\/receipt-upload"/);
            assert.doesNotMatch(html, /<button|\?callbackUrl|\?bookId|\?roomId/);
            assert.equal(html.includes(messages.Common.guideHelp.label), variant === "text");
        }
    }
});
