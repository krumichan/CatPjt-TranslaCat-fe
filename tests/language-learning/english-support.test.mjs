import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { resolveLearningDate } from "../../src/features/language-learning/common/learningDate.ts";
import { currentWritingHistory } from "../../src/features/language-learning/writing/writingProgress.ts";
import { languageOptions } from "../../src/features/languageCatalog.ts";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function loadSource(relative, modules, env = {}) {
    const source = readFileSync(new URL(`../../src/${relative}`, import.meta.url), "utf8");
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
        process: { env },
        require(name) {
            if (name === "react/jsx-runtime") return require(name);
            assert.ok(name in modules, `Unexpected dependency: ${name}`);
            return modules[name];
        },
    });
    return exports;
}

const intl = { useTranslations: (namespace) => (key) => `${namespace}.${key}` };

function writingPage(query, curatedQaEnabled = true, session = { data: { user: { publicId: "owner" }, loginSessionId: "login" }, status: "authenticated" }, onQuery = () => {}) {
    const page = loadSource("components/language-learning/writing/LanguageLearningWritingPage.tsx", {
        "next-intl": intl,
        "next-auth/react": { useSession: () => session },
        "@/components/language-learning/common/LanguageLearningStateCard": {
            LanguageLearningStateCard: ({ variant }) => React.createElement("p", { "data-state": variant }),
        },
        "@/components/language-learning/layout/LanguageLearningPageLayout": {
            LanguageLearningPageLayout: ({ children }) => React.createElement("main", null, children),
        },
        "@/components/language-learning/writing/DailyWritingSmartPage": {
            DailyWritingSmartPage: () => React.createElement("p", null, "generic-writing"),
        },
        "@/components/language-learning/writing/CuratedWritingSmartPage": {
            CuratedWritingSmartPage: () => React.createElement("p", null, "curated-writing"),
        },
        "@/hooks/useQuery": { useQuery: (options) => { onQuery(options); return query; } },
        "@/services/language-learning/languageLearningSettingService": { languageLearningSettingService: {} },
    }, { NEXT_PUBLIC_WRITING_CURATED_QA: String(curatedQaEnabled) });
    return renderToStaticMarkup(React.createElement(page.LanguageLearningWritingPage));
}

test("영어를 포함한 모든 비검수 언어 쌍은 QA 플래그가 켜져도 일반 작문으로 진입한다", () => {
    // 준비: 모국어 영어와 학습 언어 영어를 모두 포함한다.
    const pairs = [["ko", "en"], ["ja", "en"], ["en", "ko"], ["en", "ja"], ["ja", "ko"]];

    // 실행
    const markup = pairs.map(([originLanguage, learningLanguage]) => writingPage({
        data: { configured: true, originLanguage, learningLanguage },
    }));

    // 검증: 한일 전용 검수 API를 호출하는 화면으로 보내지 않는다.
    for (const html of markup) assert.equal(html, "<p>generic-writing</p>");
});

test("한국어→일본어의 검수 경로와 설정의 익일 적용 계약을 보존한다", () => {
    // 준비: 영어로 변경 예약되어 있어도 현재 유효한 언어 쌍은 한국어→일본어다.
    const query = { data: { configured: true, originLanguage: "ko", learningLanguage: "ja", pendingLearningLanguage: "en" } };

    // 실행
    const curated = writingPage(query);
    const ordinary = writingPage(query, false);

    // 검증
    assert.equal(curated, "<p>curated-writing</p>");
    assert.equal(ordinary, "<p>generic-writing</p>");
});

test("언어 설정 조회가 끝나기 전에는 검수·일반 작문을 시작하지 않는다", () => {
    // 준비
    const pending = { isLoading: true };
    const failed = { isError: new Error("offline") };

    // 실행
    const loading = writingPage(pending);
    const error = writingPage(failed);

    // 검증
    assert.match(loading, /data-state="loading"/);
    assert.match(error, /data-state="error"/);
    assert.doesNotMatch(loading + error, /generic-writing|curated-writing/);
    assert.equal(writingPage({ data: { configured: false } }), "<p>generic-writing</p>");
});

test("이전 한일 캐시 재조회와 로그인 전환 중에는 작문 경로를 열지 않는다", () => {
    // 준비: 익일 영어 설정이 적용될 수 있는 이전 한일 캐시를 재검증 중이다.
    const cached = { data: { configured: true, originLanguage: "ko", learningLanguage: "ja" }, isLoading: false, isValidating: true };
    const account = { data: { user: { publicId: "new-owner" }, loginSessionId: "new-login" }, status: "authenticated" };
    let queryOptions;

    // 실행
    const validating = writingPage(cached, true, account, (options) => { queryOptions = options; });
    const switching = writingPage(cached, true, { data: null, status: "loading" });

    // 검증: 조회 키는 계정·로그인별로 분리되고, 오래된 한일 캐시는 검수 화면을 열지 못한다.
    assert.equal(JSON.stringify(queryOptions.keys), JSON.stringify(["writing-mode-setting", "new-owner", "new-login"]));
    assert.equal(queryOptions.config.revalidateOnMount, true);
    assert.equal(queryOptions.config.dedupingInterval, 0);
    assert.match(validating, /data-state="loading"/);
    assert.match(switching, /data-state="loading"/);
    assert.doesNotMatch(validating + switching, /generic-writing|curated-writing/);
});

for (const [locale, englishName] of [["ko", "영어"], ["ja", "英語"], ["en", "English"], ["learning", "英語 / 영어"]]) {
    test(`${locale} 화면의 영어 선택지는 현지화된 이름과 en API 값을 함께 보존한다`, () => {
        // 준비: 실제 메시지와 공통 언어 옵션 훅을 설정 선택기에 연결한다.
        const messages = JSON.parse(readFileSync(new URL(`../../messages/${locale}/common.json`, import.meta.url), "utf8"));
        const options = loadSource("constants/chatLanguages.ts", {});
        const hook = loadSource("hooks/useLanguageOptions.ts", {
            "next-intl": { useLocale: () => locale, useTranslations: () => (key) => messages.Common.languages[key] },
            "next-auth/react": { useSession: () => ({ status: "authenticated" }) },
            "swr": { __esModule: true, default: () => ({ data: undefined }) },
            "@/constants/chatLanguages": options,
            "@/features/languageCatalog": { languageOptions },
            "@/services/languageService": { languageService: { getLanguages() {} } },
        });
        const field = loadSource("components/settings/chat/ChatLanguageSelectField.tsx", {
            "@/hooks/useLanguageOptions": hook,
        });

        // 실행
        const markup = renderToStaticMarkup(React.createElement(field.default, {
            label: "language", value: "en", onChange() {},
        }));

        // 검증: 표시는 현재 UI 언어를 따르고 저장 코드는 항상 en이다.
        assert.ok(markup.includes(`<option value="en" selected="">${englishName}</option>`));
        assert.equal((markup.match(/<option /g) ?? []).length, 3);
    });
}

test("영어 작문 답안·교정·근거는 실제 렌더링에서도 영어 언어 메타데이터를 사용한다", () => {
    // 준비: 영어 학습 결과를 일본어 UI와 독립적으로 렌더링한다.
    const view = loadSource("components/language-learning/writing/paragraph/ParagraphWritingItemCard.tsx", {
        "next-intl": intl,
        "./ParagraphWritingReference": { ParagraphWritingReference: () => null },
    });
    const item = {
        itemId: 1, order: 1, difficulty: "NORMAL", targetBand: 2,
        originText: "친구에게 안부를 물어보세요.", providedFacts: [], requiredIntents: [], responseConstraints: [],
        canSubmit: true, attempts: [{
            answerId: 2, answer: "How is you?", attemptDate: "2026-10-16",
            feedback: { status: "SUCCEEDED", result: {
                policyVersion: "curated-writing-feedback-v2",
                observations: [{ requirementId: "C1", status: "MET", originText: "안부를 물었습니다.", learningText: "You asked how your friend is.", answerQuotes: ["How is you?"] }],
                necessaryCorrections: [{ requirementId: "C1", original: "How is you?", replacement: "How are you?", originText: "동사를 고칩니다.", learningText: "Use are with you." }],
                optionalAlternatives: [], uncertainties: [],
            } },
        }],
    };

    // 실행
    const markup = renderToStaticMarkup(React.createElement(view.ParagraphWritingItemCard, {
        item, originLanguage: "ko", learningLanguage: "en", draft: "", maxLength: 3000,
        busy: false, showWorkload: false, onDraft() {}, onSubmit() {}, onRetryFeedback() {},
    }));

    // 검증: 답안 입력과 저장 답안, 근거 인용, 교정 설명까지 실제 언어를 따른다.
    assert.match(markup, /<textarea[^>]*lang="en"/);
    assert.match(markup, /<p lang="en"[^>]*>How is you\?<\/p>/);
    assert.match(markup, /<blockquote lang="en"[^>]*>How is you\?<\/blockquote>/);
    assert.match(markup, /<p lang="en">Use are with you\.<\/p>/);
    assert.match(markup, /<p lang="ko"[^>]*data-testid="paragraph-source"/);
    assert.doesNotMatch(markup, /lang="ja"/);
});

test("현재 영어 수준의 최근 측정 링크에 일본어 및 언어 미상 이력을 섞지 않는다", () => {
    // 준비: 전체 이력의 첫 행은 다른 언어이며, 과거 DTO에는 언어 태그가 없을 수 있다.
    let history = [
        { sessionId: 3, originLanguage: "ko", learningLanguage: "ja" },
        { sessionId: 2 },
        { sessionId: 1, originLanguage: "ko", learningLanguage: "en" },
    ];
    const controller = loadSource("hooks/language-learning/useLanguageLearningDashboardPageController.ts", {
        react: { useCallback: (callback) => callback, useState: (value) => [value, () => {}] },
        "@/hooks/language-learning/useLanguageLearningEntryState": {
            useLanguageLearningEntryState: () => ({ setting: { configured: true, originLanguage: "ko", learningLanguage: "en" }, levelStatus: { profileState: "ACTIVE" } }),
        },
        "@/hooks/useQuery": {
            useQuery: ({ keys }) => ({ data: keys?.[0] === "language-learning-dashboard-level-history" ? history : null }),
        },
        "@/services/language-learning/languageLearningDashboardService": {},
        "@/services/language-learning/languageLearningLevelService": {},
        "@/services/language-learning/languageLearningProfileService": {},
        "@/services/language-learning/listeningService": {},
    });

    // 실행
    const matching = controller.useLanguageLearningDashboardPageController().latestLevelTest;
    history = history.slice(0, 2);
    const missing = controller.useLanguageLearningDashboardPageController().latestLevelTest;

    // 검증: 일치하는 저장 언어 쌍만 최신 결과로 연결하며 전체 이력 배열은 변경하지 않는다.
    assert.equal(matching.sessionId, 1);
    assert.equal(missing, null);
    assert.equal(history.length, 2);
});

test("실제 일반 작문의 영어 입력·저장 답안과 한국어 원문이 각각 언어를 표시한다", () => {
    // 준비: 실제 일반 작문 카드와 원문 컴포넌트를 연결한다.
    const prompt = loadSource("components/language-learning/writing/DailyWritingPromptBlock.tsx", {
        "next-intl": intl,
        "@/components/language-learning/writing/WritingGuideSection": { WritingGuideSection: () => null },
    });
    const card = loadSource("components/language-learning/writing/DailyWritingItemCard.tsx", {
        "next-intl": intl,
        "lucide-react": { CircleAlert: () => null, CloudCheck: () => null, LoaderCircle: () => null },
        "@/components/language-learning/writing/DailyWritingPromptBlock": prompt,
        "@/components/language-learning/writing/WritingEvaluationPanel": { WritingEvaluationPanel: () => null },
    });

    // 실행
    const markup = renderToStaticMarkup(React.createElement(card.DailyWritingItemCard, {
        item: { order: 1, difficulty: "NORMAL", keywords: [], originText: "회의에 참석할 수 있나요?", canSubmit: true,
            attempts: [{ answer: "Can you attend the meeting?", evaluationStatus: null }] },
        writingType: "TRANSLATION", originLanguage: "ko", learningLanguage: "en", draft: "Can you attend the meeting?",
        isSubmitting: false, isInteractionLocked: false, draftPersistenceEnabled: false, onDraftChange() {}, onSubmit() {},
    }));

    // 검증: 영어 입력은 UI 언어를 상속하지 않고, 제시문은 원문 언어를 유지한다.
    assert.match(markup, /<textarea lang="en"[^>]*>Can you attend the meeting\?<\/textarea>/);
    assert.match(markup, /<p lang="en"[^>]*>Can you attend the meeting\?<\/p>/);
    assert.match(markup, /<p lang="ko"[^>]*>회의에 참석할 수 있나요\?<\/p>/);
});

test("언어와 시간대가 함께 전환되어 학습일이 겹쳐도 영어 작문 진행은 영어 이력만 따른다", () => {
    // 준비: 도쿄의 다음 학습일에 변경이 적용되어도 LA에서는 이전 calendar date일 수 있다.
    const oldDate = resolveLearningDate("Asia/Tokyo", new Date("2026-10-16T05:00:00Z"));
    const newDate = resolveLearningDate("America/Los_Angeles", new Date("2026-10-16T16:00:00Z"));
    const history = [
        { activityId: "WRITING:ja", source: "WRITING", originLanguage: "ko", learningLanguage: "ja", learningDate: oldDate, completionStatus: "COMPLETED", overallScore: 99 },
        { activityId: "WRITING:unknown", source: "WRITING", learningDate: newDate, completionStatus: "COMPLETED", overallScore: 100 },
        { activityId: "WRITING:en", source: "WRITING", originLanguage: "ko", learningLanguage: "en", learningDate: newDate, completionStatus: "IN_PROGRESS", overallScore: null },
        { activityId: "WEB_AI:en", source: "WEB_AI", originLanguage: "ko", learningLanguage: "en", learningDate: newDate, completionStatus: "COMPLETED", overallScore: 95 },
    ];

    // 실행
    const current = currentWritingHistory(history, newDate, "ko", "en");
    const unknownPair = currentWritingHistory(history, newDate, null, null);

    // 검증: 전체 과거 목록은 보존하며 현재 기본 작문의 상태·점수에 다른 출처를 섞지 않는다.
    assert.equal(oldDate, newDate);
    assert.deepEqual(current.map((item) => item.activityId), ["WRITING:en"]);
    assert.equal(current[0].completionStatus, "IN_PROGRESS");
    assert.deepEqual(unknownPair, []);
    assert.equal(history.length, 4);
});
