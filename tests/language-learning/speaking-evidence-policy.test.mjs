import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

for (const locale of ["ko", "ja", "learning"]) {
    test(`Speaking evidence limitations have localized labels in ${locale}`, () => {
        const root = JSON.parse(readFileSync(new URL(`../../messages/${locale}/languageLearning.json`, import.meta.url), "utf8"));
        for (const key of ["evidencePolicyTitle", "transcriptOnlyNotice", "evaluatedAxesCoverage",
            "evidencePolicyVersion", "scoreComparisonNotice", "readAloudScriptAccuracyNotice"]) {
            assert.ok(root.LanguageLearning.speaking.evaluation[key]);
        }
        assert.ok(root.LanguageLearning.speaking.session.turn.transcriptObservationNotice);
    });
}
test("session and read-aloud results expose evidence coverage without relabelling legacy results", () => {
    const read = (name) => readFileSync(new URL(`../../src/components/language-learning/speaking/evaluation/${name}.tsx`, import.meta.url), "utf8");
    assert.match(read("SpeakingEvaluationResult"), /SpeakingEvidenceNotice evidence=\{evaluation\}/);
    assert.match(read("SpeakingReadAloudEvaluationItem"), /SpeakingEvidenceNotice evidence=\{item\} readAloud/);
    assert.match(read("SpeakingEvidenceNotice"), /if \(!evidence\.evidencePolicyVersion\) return null/);
    assert.match(read("SpeakingEvidenceNotice"), /evaluationCoverage \* 100/);
    assert.match(read("SpeakingEvidenceNotice"), /metrics\.\$\{axis\}/);
});
