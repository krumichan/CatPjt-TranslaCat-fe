import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { readingPassageExpressions } from "../../src/features/language-learning/practice/readingPassageExpressions.ts";

const passage = "計画を確認する。計画は変わらない。\n\nこの計画を共有する。";
function question(order, answered = true) {
    return { order, answered, passageId: order <= 3 ? "p1" : "p2", passageText: passage, vocabularyCandidates: ["計画"] };
}
function set(questions, domain = "READING") {
    return { domain, questions, questionCount: 5, status: "ACTIVE", officialScore: null };
}

test("passage expression release requires every planned passage order, not only received questions", () => {
    assert.deepEqual(readingPassageExpressions(set([question(1)])), []);
    assert.deepEqual(readingPassageExpressions(set([question(1), question(2), question(3, false)])), []);
    const full = set([question(1), question(2), question(3), question(4), question(5, false)]);
    assert.deepEqual(readingPassageExpressions(full).map((item) => item.passageId), ["p1"]);
    assert.deepEqual(readingPassageExpressions(full, "p2"), []);
    assert.equal(full.officialScore, null);
    assert.equal(full.questionCount, 5);
    assert.equal(full.status, "ACTIVE");
});

test("exact surface metadata is optional, deduplicated and keeps all actual source quotes", () => {
    const full = set([question(1), question(2), question(3)]);
    full.questions[0].vocabularyCandidates = [" 計画 ", "計画した", "計画", "missing", null, 1];
    full.questions[1].vocabularyCandidates = null;
    const expressions = readingPassageExpressions(full);
    assert.equal(expressions.length, 1);
    assert.equal(expressions[0].expression, "計画");
    assert.deepEqual(expressions[0].sourceQuotes, passage.split("\n\n"));
    assert.equal("offset" in expressions[0], false);
    full.questions.forEach((item) => { item.vocabularyCandidates = []; });
    assert.deepEqual(readingPassageExpressions(full), []);
});

test("duplicate slots, inconsistent passages and legacy Vocabulary never expose enrichment", () => {
    assert.deepEqual(readingPassageExpressions(set([question(1), question(1), question(2), question(3)])), []);
    const inconsistent = set([question(1), question(2), { ...question(3), passageText: "異なる本文" }]);
    assert.deepEqual(readingPassageExpressions(inconsistent), []);
    assert.deepEqual(readingPassageExpressions(set([question(1), question(2), question(3)], "VOCABULARY")), []);
});

test("retired landing exits before mounting generation hooks and historical session cannot retry generation", async () => {
    const landing = await readFile(new URL("../../src/components/language-learning/practice/PracticeModeLandingPage.tsx", import.meta.url), "utf8");
    const publicEntry = landing.split("function AvailablePracticeModeLandingPage")[0];
    assert.match(publicEntry, /if \(domain === "VOCABULARY"\) return <VocabularyRetirementPage/);
    assert.doesNotMatch(publicEntry, /const entry = useLanguageLearningEntryState\(/);
    const hook = await readFile(new URL("../../src/hooks/language-learning/practice/usePracticeSessionController.ts", import.meta.url), "utf8");
    assert.match(hook, /generating = expectedDomain !== "VOCABULARY"/);
    assert.match(hook, /if \(expectedDomain === "VOCABULARY" \|\| retryingGeneration/);
    assert.match(hook, /readingVocabularyService\.submitAnswer/);
    assert.match(hook, /completed: isPracticeComplete\(set\)/);
});

test("B5 structure availability is server-owned and verified history stays reachable", async () => {
    const landing = await readFile(new URL("../../src/components/language-learning/practice/PracticeModeLandingPage.tsx", import.meta.url), "utf8");
    const service = await readFile(new URL("../../src/services/language-learning/readingVocabularyService.ts", import.meta.url), "utf8");
    const progress = await readFile(new URL("../../src/components/language-learning/common/GenerationProgress.tsx", import.meta.url), "utf8");
    assert.match(service, /\/language-learning\/practice\/today\/availability/);
    assert.match(landing, /!availabilityByMode\.get\("STRUCTURE"\)\?\.generationAvailable/);
    assert.match(landing, /if \(existing\?\.practiceSetId\)/);
    assert.match(landing, /disabled=\{Boolean\(startingMode\) \|\| unavailable\}/);
    assert.match(progress, /failureMessage === "READING_B5_STRUCTURE_DEFERRED"/);
    assert.match(progress, /failureMessage && !deferred && onRetry/);
});
