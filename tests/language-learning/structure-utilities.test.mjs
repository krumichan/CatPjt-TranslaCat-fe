import assert from "node:assert/strict";
import test from "node:test";

import { formatDuration } from "../../src/utils/time/formatDuration.ts";
import { resolveLearningDate } from "../../src/features/language-learning/common/learningDate.ts";
import { resolvePeriod } from "../../src/features/language-learning/dashboard/dashboardPeriod.ts";
import { latestBy } from "../../src/features/language-learning/dashboard/listeningTrend.ts";
import { resolveListeningResultMetric } from "../../src/features/language-learning/listening/resultMetric.ts";
import { isValidListeningTaskSelection } from "../../src/features/language-learning/listening/taskSelection.ts";
import { groupSystemKeywords } from "../../src/features/language-learning/keyword/keywordGrouping.ts";
import { userAnswerText, correctAnswerText } from "../../src/features/language-learning/level-test/reviewAnswer.ts";
import { splitPromptEmphasis, stripPromptMarkup } from "../../src/features/language-learning/level-test/promptText.ts";
import { createEmptyWritingTypeProgress, latestAttempt, latestEvaluationStatus, resolveHistoryWritingType } from "../../src/features/language-learning/writing/writingProgress.ts";
import { canSubmitPracticeAnswer, firstWorkingIndex, getPracticeCurrentAnswer, getPracticeSelectionContext, getWrongOfficialPracticeQuestions, isPracticeComplete, resolvePracticeSelection } from "../../src/features/language-learning/practice/practiceSessionState.ts";
import { flattenSpeakingAssistanceUsage, summarizeSpeakingAssistanceUsage, countSpeakingAssistanceUsage } from "../../src/features/language-learning/speaking/assistanceUsage.ts";
import { hasSpeakingPromptGuide, resolveSpeakingPromptGuide, selectReadAloudPromptTurn } from "../../src/features/language-learning/speaking/promptGuide.ts";
import { normalizeStatus } from "../../src/features/language-learning/speaking/readAloudState.ts";
import { parseEvidence, parseJsonArray, parsePronunciationPractice, parseRecommendedExpressions, parseTextList } from "../../src/features/language-learning/speaking/evaluationParser.ts";

for (const [seconds, expected] of [[0, "0:00"], [5, "0:05"], [59.99, "0:59"], [60, "1:00"], [3661, "61:01"], [-5, "0:00"], [NaN, "0:00"], [Infinity, "0:00"], [-Infinity, "0:00"]]) {
    test(`duration ${seconds} is ${expected}`, () => assert.equal(formatDuration(seconds), expected));
}

test("learning date uses the configured timezone, not the machine timezone", () => {
    const now = new Date("2026-09-09T15:30:00Z");
    assert.equal(resolveLearningDate("Asia/Tokyo", now), "2026-09-10");
    assert.equal(resolveLearningDate("UTC", now), "2026-09-09");
    assert.equal(resolveLearningDate("America/Los_Angeles", now), "2026-09-09");
});
test("dashboard periods remain inclusive local-calendar ranges across a year boundary", () => {
    const now = new Date(2026, 0, 1, 12);
    const before = now.getTime();
    assert.deepEqual(resolvePeriod("7d", now), { from: "2025-12-26", to: "2026-01-01" });
    assert.deepEqual(resolvePeriod("30d", now), { from: "2025-12-03", to: "2026-01-01" });
    assert.equal(now.getTime(), before);
});
test("dashboard periods handle leap-day boundaries", () => {
    assert.deepEqual(resolvePeriod("7d", new Date(2024, 2, 1, 12)), { from: "2024-02-24", to: "2024-03-01" });
});
test("trend grouping selects the latest date and the later item on ties", () => {
    const rows = [{ key: "a", date: "2026-09-02", value: 1 }, { key: "a", date: "2026-09-01", value: 2 }, { key: "b", date: "2026-09-03", value: 3 }, { key: "a", date: "2026-09-02", value: 4 }];
    const result = latestBy(rows, (row) => row.key);
    assert.equal(result.get("a"), rows[3]);
    assert.equal(result.get("b"), rows[2]);
    assert.equal(latestBy([], () => "").size, 0);
});

for (const [metric, expected] of [
    [{ metric: "FLUENCY", score: 0, value: 80 }, { key: "FLUENCY", value: 0, known: true }],
    [{ name: "GIST_COVERAGE", value: 65.4 }, { key: "GIST_COVERAGE", value: 65.4, known: true }],
    [{ type: "CUSTOM", confidence: 0.5, amount: 33 }, { key: "CUSTOM", value: 33, known: false }],
    [{ CUSTOM: 44 }, { key: "CUSTOM", value: 44, known: false }],
    [{ confidence: 0.9 }, { key: "confidence", value: undefined, known: false }],
    [{ metric: "FLUENCY", score: "bad", value: 10 }, { key: "FLUENCY", value: "bad", known: true }],
    [{}, { key: "metric", value: undefined, known: false }],
]) {
    test(`listening metric normalization: ${JSON.stringify(metric)}`, () => assert.deepEqual(resolveListeningResultMetric(metric), expected));
}
for (const [tasks, expected] of [
    [[], false], [["COMPREHENSION"], true], [["SUMMARY"], true], [["DICTATION"], true], [["REPEAT_AFTER_AUDIO"], true], [["INTERPRETATION"], false], [["DICTATION", "INTERPRETATION"], true], [["DICTATION", "DICTATION"], false], [["SUMMARY", "DICTATION"], false], [["COMPREHENSION", "SUMMARY"], false],
]) {
    test(`listening task selection ${tasks.join("+") || "empty"}`, () => assert.equal(isValidListeningTaskSelection(tasks), expected));
}
test("keyword grouping sorts copies and retains orphaned children as ungrouped", () => {
    const input = [
        { id: 5, type: "TOPIC", parentKeywordId: 99, sortOrder: 3 },
        { id: 3, type: "TOPIC", parentKeywordId: 1, sortOrder: 1 },
        { id: 2, type: "TOPIC", parentKeywordId: null, sortOrder: 1 },
        { id: 1, type: "TOPIC", parentKeywordId: null, sortOrder: 1 },
    ];
    const before = input.map((x) => x.id);
    const grouped = groupSystemKeywords(input);
    assert.deepEqual(grouped.keywords.map((x) => x.id), [1, 2, 3, 5]);
    assert.deepEqual(grouped.topics.map((x) => x.id), [1, 2]);
    assert.deepEqual(grouped.ungrouped.map((x) => x.id), [5]);
    assert.deepEqual(input.map((x) => x.id), before);
    assert.deepEqual(groupSystemKeywords([]), { keywords: [], topics: [], ungrouped: [] });
});

const review = (overrides = {}) => ({ textAnswer: null, options: [{ key: "A", text: "Alpha" }, { key: "B", text: "Beta" }], selectedOptionKeys: [], selectedOptionKey: null, correctOrder: [], correctOptionKey: null, ...overrides });
test("history answer formatting preserves text, sequence and single-choice precedence", () => {
    assert.equal(userAnswerText(review({ textAnswer: "free", selectedOptionKeys: ["B"], selectedOptionKey: "A" })), "free");
    assert.equal(userAnswerText(review({ selectedOptionKeys: ["B", "missing", "A"], selectedOptionKey: "A" })), "B. Beta → missing → A. Alpha");
    assert.equal(userAnswerText(review({ selectedOptionKey: "B" })), "B. Beta");
    assert.equal(userAnswerText(review()), null);
});
test("history correct answer formatting uses the sequence before single-choice metadata", () => {
    assert.equal(correctAnswerText(review({ correctOrder: ["B", "A"], correctOptionKey: "A" })), "B. Beta → A. Alpha");
    assert.equal(correctAnswerText(review({ correctOptionKey: "missing" })), "missing");
    assert.equal(correctAnswerText(review()), null);
});
test("prompt markup is removed without interpreting or injecting HTML", () => {
    assert.equal(stripPromptMarkup("<b>日本語</b> <script>x</script>"), "日本語 x");
    assert.equal(stripPromptMarkup("3 < 10"), "3 < 10");
});
test("prompt emphasis marks only the first exact, trimmed target", () => {
    assert.deepEqual(splitPromptEmphasis("<b>猫</b>と猫", " 猫 "), { before: "", target: "猫", after: "と猫" });
    assert.deepEqual(splitPromptEmphasis("猫", "犬"), { before: "猫", target: null, after: "" });
    assert.deepEqual(splitPromptEmphasis("<b>猫</b>", "  "), { before: "猫", target: null, after: "" });
});
test("writing mode inference prioritizes valid topic metadata and falls back to title suffix", () => {
    assert.equal(resolveHistoryWritingType("FREE", "Writing · GUIDED"), "FREE");
    assert.equal(resolveHistoryWritingType(null, "Writing · GUIDED"), "GUIDED");
    assert.equal(resolveHistoryWritingType("other", "Writing · TRANSLATION"), "TRANSLATION");
    assert.equal(resolveHistoryWritingType(null, "Writing"), null);
});
test("writing progress initializes independent per-mode objects", () => {
    const progress = createEmptyWritingTypeProgress();
    assert.deepEqual(Object.keys(progress), ["TRANSLATION", "GUIDED", "FREE"]);
    assert.equal(progress.TRANSLATION.state, "NOT_STARTED");
    progress.TRANSLATION.state = "COMPLETED";
    assert.equal(progress.GUIDED.state, "NOT_STARTED");
    assert.equal(createEmptyWritingTypeProgress().TRANSLATION.state, "NOT_STARTED");
});
test("writing attempt and evaluation selectors retain server array ordering", () => {
    const first = { id: 9, evaluationStatus: "FAILED" };
    const last = { id: 1, evaluationStatus: "EVALUATED" };
    assert.equal(latestAttempt({ attempts: [first, last] }), last);
    assert.equal(latestEvaluationStatus({ attempts: [first, last] }), "EVALUATED");
    assert.equal(latestAttempt({ attempts: [] }), null);
    assert.equal(latestEvaluationStatus({ attempts: [] }), null);
});

const question = (id, changes = {}) => ({ questionId: id, answered: false, correct: false, canRetry: false, attempts: [], ...changes });
const practiceSet = (changes = {}) => ({ status: "ACTIVE", generationStatus: "READY", questionCount: 5, questions: [], ...changes });
test("practice resume prioritizes unanswered items over retryable wrong answers", () => {
    assert.equal(firstWorkingIndex(practiceSet({ questions: [question(1, { answered: true, canRetry: true }), question(2)] })), 1);
    assert.equal(firstWorkingIndex(practiceSet({ questions: [question(1, { answered: true, correct: true }), question(2, { answered: true, canRetry: true })] })), 1);
    assert.equal(firstWorkingIndex(practiceSet()), 0);
    assert.equal(firstWorkingIndex(practiceSet({ questions: [question(1, { answered: true, correct: true }), question(2, { answered: true, correct: true })] })), 1);
});
test("practice selection survives new response objects and appended generated items", () => {
    const current = question(1);
    const context = getPracticeSelectionContext(60001, current);
    const selection = { context, answer: ["B"] };
    const refreshed = structuredClone(current);
    assert.equal(getPracticeSelectionContext(60001, refreshed), context);
    assert.deepEqual(resolvePracticeSelection(selection, getPracticeSelectionContext(60001, refreshed), []), ["B"]);
    const appended = practiceSet({ questions: [refreshed, question(2)] });
    assert.equal(getPracticeSelectionContext(60001, appended.questions[0]), context);
});
test("practice selection resets for a different set, question, attempt or answer revision", () => {
    const current = question(1, { canRetry: true, attempts: [{ attemptId: 5, answer: ["A"] }] });
    const context = getPracticeSelectionContext(1, current);
    for (const [setId, next] of [
        [2, current], [1, { ...current, questionId: 2 }],
        [1, { ...current, attempts: [{ attemptId: 6, answer: ["A"] }] }],
        [1, { ...current, attempts: [{ attemptId: 5, answer: ["B"] }] }],
        [1, { ...current, canRetry: false }],
    ]) {
        const nextContext = getPracticeSelectionContext(setId, next);
        assert.notEqual(nextContext, context);
        assert.deepEqual(resolvePracticeSelection({ context, answer: ["C"] }, nextContext, ["initial"]), ["initial"]);
    }
});
test("practice current-answer selection returns the latest attempt", () => {
    assert.deepEqual(getPracticeCurrentAnswer(null), []);
    assert.deepEqual(getPracticeCurrentAnswer(question(1, { attempts: [{ answer: ["A"] }, { answer: ["B"] }] })), ["B"]);
});
test("practice submission guards reject missing, empty, busy, correct or exhausted answers", () => {
    assert.equal(canSubmitPracticeAnswer(null, ["A"], false), false);
    assert.equal(canSubmitPracticeAnswer(question(1), [], false), false);
    assert.equal(canSubmitPracticeAnswer(question(1), ["A"], true), false);
    assert.equal(canSubmitPracticeAnswer(question(1, { correct: true }), ["A"], false), false);
    assert.equal(canSubmitPracticeAnswer(question(1, { attempts: [{}] }), ["A"], false), false);
    assert.equal(canSubmitPracticeAnswer(question(1), ["A"], false), true);
    assert.equal(canSubmitPracticeAnswer(question(1, { attempts: [{}], canRetry: true }), ["A"], false), true);
});
test("practice completion requires distinct full coverage, settled generation and all answers", () => {
    const complete = practiceSet({ status: "COMPLETED", questions: Array.from({ length: 5 }, (_, i) => question(i + 1, { answered: true })) });
    assert.equal(isPracticeComplete(complete), true);
    assert.equal(isPracticeComplete({ ...complete, generationStatus: "GENERATING" }), false);
    assert.equal(isPracticeComplete({ ...complete, questions: complete.questions.slice(0, 4) }), false);
    assert.equal(isPracticeComplete({ ...complete, questions: [...complete.questions.slice(0, 4), complete.questions[0]] }), false);
    assert.equal(isPracticeComplete({ ...complete, questions: [...complete.questions.slice(0, 4), question(5)] }), false);
    assert.equal(isPracticeComplete({ ...complete, status: "ACTIVE" }), false);
    assert.equal(isPracticeComplete(null), false);
});
test("official wrong-answer review retains recovered items and excludes nonofficial attempts", () => {
    const recovered = question(1, { correct: true, attempts: [{ official: true, correct: false }, { official: false, correct: true }] });
    const correct = question(2, { attempts: [{ official: true, correct: true }] });
    const nonofficial = question(3, { attempts: [{ official: false, correct: false }] });
    assert.deepEqual(getWrongOfficialPracticeQuestions(practiceSet({ questions: [recovered, correct, nonofficial] })), [{ q: recovered, index: 0 }]);
});

const guide = (changes = {}) => ({ scriptText: null, providedFacts: [], requiredIntents: [], responseConstraints: [], ...changes });
const speakingDetail = (changes = {}) => ({ session: { practiceMode: "READ_ALOUD", openingPromptGuide: guide({ scriptText: "opening" }), openingAssistantText: "fallback" }, turns: [], ...changes });
test("speaking guide presence recognizes script and each guidance list", () => {
    assert.equal(hasSpeakingPromptGuide(null), false);
    assert.equal(hasSpeakingPromptGuide(guide()), false);
    assert.equal(hasSpeakingPromptGuide(guide({ scriptText: "  " })), false);
    for (const prop of ["providedFacts", "requiredIntents", "responseConstraints"]) assert.equal(hasSpeakingPromptGuide(guide({ [prop]: ["hint"] })), true);
    assert.equal(hasSpeakingPromptGuide(guide({ scriptText: "hello" })), true);
});
test("read-aloud prompt selection uses the latest previous-problem assistant turn", () => {
    const turns = [{ id: 1, problemIndex: 1, assistantText: "first" }, { id: 2, problemIndex: 1, assistantText: "latest" }, { id: 3, problemIndex: 2, assistantText: "current" }];
    const detail = speakingDetail({ turns });
    assert.equal(selectReadAloudPromptTurn(detail, 1), null);
    assert.equal(selectReadAloudPromptTurn(detail, 2), turns[1]);
    assert.deepEqual(turns.map((x) => x.id), [1, 2, 3]);
    assert.equal(selectReadAloudPromptTurn({ ...detail, session: { ...detail.session, practiceMode: "GUIDED" } }, 2), null);
});
test("read-aloud guide resolution preserves script precedence and assistant-text fallback", () => {
    const detail = speakingDetail();
    assert.equal(resolveSpeakingPromptGuide(detail, null).scriptText, "opening");
    assert.equal(resolveSpeakingPromptGuide(detail, { promptGuide: guide({ scriptText: "script" }), assistantText: "assistant" }).scriptText, "script");
    assert.equal(resolveSpeakingPromptGuide(detail, { promptGuide: guide(), assistantText: "assistant" }).scriptText, "assistant");
    assert.deepEqual(resolveSpeakingPromptGuide(detail, { promptGuide: null, assistantText: "assistant" }), guide({ scriptText: "assistant" }));
});
test("guided speaking selects the latest nonempty guide and then the opening guide", () => {
    const first = guide({ requiredIntents: ["explain"] });
    const second = guide({ providedFacts: ["fact"] });
    const detail = speakingDetail({ session: { practiceMode: "GUIDED", openingPromptGuide: guide({ scriptText: "opening" }) }, turns: [{ promptGuide: first }, { promptGuide: second }, { promptGuide: guide() }] });
    assert.equal(resolveSpeakingPromptGuide(detail, null), second);
    assert.equal(resolveSpeakingPromptGuide({ ...detail, turns: [] }, null), detail.session.openingPromptGuide);
});
test("speaking assistance totals preserve repeated actions and tolerate missing usage arrays", () => {
    const turns = [{ assistanceUsage: ["REPLAY", "REPLAY", "HINT"] }, {}, { assistanceUsage: null }, { assistanceUsage: ["TRANSLATION", "SAMPLE_ANSWER"] }];
    assert.deepEqual(flattenSpeakingAssistanceUsage(turns), ["REPLAY", "REPLAY", "HINT", "TRANSLATION", "SAMPLE_ANSWER"]);
    assert.deepEqual(summarizeSpeakingAssistanceUsage(turns), { total: 5, neutral: 2, assisted: 2, guided: 1 });
    assert.equal(countSpeakingAssistanceUsage(["REPLAY", "HINT", "HINT"], ["HINT"]), 2);
});
test("read-aloud status normalization preserves known statuses and isolates future values", () => {
    for (const status of ["PENDING", "EVALUATING", "EVALUATED", "INSUFFICIENT_EVIDENCE", "FAILED"]) assert.equal(normalizeStatus(status), status);
    assert.equal(normalizeStatus("NEW_STATUS"), "OTHER");
});
test("speaking parsers preserve their existing array-only contract", () => {
    for (const parse of [parseJsonArray, parseEvidence, parseRecommendedExpressions, parsePronunciationPractice, parseTextList]) {
        for (const value of [null, "", "invalid", "{}", "null", "1"]) assert.deepEqual(parse(value), []);
        assert.deepEqual(parse('[{"value":1}]'), [{ value: 1 }]);
    }
    assert.deepEqual(parseTextList('["a","b"]'), ["a", "b"]);
});
