import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    CURRENT_VOCABULARY_MODE,
    CURRENT_VOCABULARY_SKILLS,
    VOCABULARY_DAILY_NEW_MAX,
    VOCABULARY_DAILY_QUESTION_COUNT,
    VOCABULARY_DAILY_REVIEW_MAX,
} from "../../src/features/language-learning/practice/vocabularyPolicy.ts";

const messageFiles = ["ko", "ja", "learning"];

test("current vocabulary policy exposes one contextual 10-item flow", () => {
    assert.equal(CURRENT_VOCABULARY_MODE, "CONTEXTUAL_CHOICE");
    assert.equal(VOCABULARY_DAILY_QUESTION_COUNT, 10);
    assert.equal(VOCABULARY_DAILY_NEW_MAX, 8);
    assert.equal(VOCABULARY_DAILY_REVIEW_MAX, 2);
    assert.deepEqual(CURRENT_VOCABULARY_SKILLS, [
        "MEANING",
        "COLLOCATION",
        "NUANCE",
        "REGISTER",
        "PRAGMATIC_FIT",
    ]);
});

test("landing page exposes only the current vocabulary mode", async () => {
    const source = await readFile(
        new URL("../../src/components/language-learning/practice/PracticeModeLandingPage.tsx", import.meta.url),
        "utf8",
    );

    const vocabularyModes = source.match(/const VOCABULARY_MODES = \[(.*?)\] as const;/s)?.[1] ?? "";
    assert.match(vocabularyModes, /CURRENT_VOCABULARY_MODE/);
    assert.doesNotMatch(vocabularyModes, /MEANING_RELATION|USAGE_DISTINCTION|COMPOSITION/);
});

for (const locale of messageFiles) {
    test(`${locale} messages cover the contextual mode and all current skills`, async () => {
        const raw = await readFile(
            new URL(`../../messages/${locale}/languageLearning.json`, import.meta.url),
            "utf8",
        );
        const messages = JSON.parse(raw).LanguageLearning;

        assert.ok(messages.vocabulary.modes.CONTEXTUAL_CHOICE.title);
        assert.ok(messages.vocabulary.modes.CONTEXTUAL_CHOICE.description);
        assert.match(messages.vocabulary.selector.notice, /10/);
        for (const skill of CURRENT_VOCABULARY_SKILLS) {
            assert.ok(messages.vocabulary.skills[skill]);
            assert.ok(messages.dashboard.metric[skill]);
        }
    });
}
