import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// 既存のTypeScriptを変換し、ネットワーク境界だけを置き換えて実際のサービス関数を実行する。
function loadSource(relative, imports = {}) {
  const text = readFileSync(new URL(relative, import.meta.url), "utf8");
  const output = ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    exports: module.exports,
    require: (name) => {
      assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`);
      return imports[name];
    },
  });
  return module.exports;
}

test("initial choices cover only B1-B3 at the rounded integer interval midpoints", () => {
  // 準備・実行・検証: 上位帯域を選択肢に追加せず、サーバーの整数得点契約に一致させる。
  const { LEVEL_SELF_SELECTION_OPTIONS: choices } = loadSource(
    "../../src/features/language-learning/level-test/selfSelection.ts",
  );
  assert.deepEqual(JSON.parse(JSON.stringify(choices)), [
    { band: "B1", score: 20, proficiencyBand: "FOUNDATION" },
    { band: "B2", score: 47, proficiencyBand: "BASIC" },
    { band: "B3", score: 62, proficiencyBand: "INTERMEDIATE" },
  ]);
});

test("the service sends only the selected band and retry key and returns the server result", async () => {
  // 準備: サーバーが確定した結果を用意し、外部通信を記録する。
  const calls = [];
  const result = { sessionId: 42, sessionType: "SELF_SELECTED", totalQuestions: 0, baseLevelScore: 47 };
  const { languageLearningLevelService: service } = loadSource(
    "../../src/services/language-learning/languageLearningLevelService.ts",
    {
      "@/lib/apiClient": { apiClient: async (...args) => { calls.push(args); return result; } },
      "@/services/common/responseParser": { parseResponseBody: (body, context) => {
        assert.equal(context, "LanguageLearningLevelSelfSelection");
        return body;
      } },
    },
  );

  // 実行・検証: 所有者や得点をリクエストに混入させず、結果を実測へ変換しない。
  assert.equal(await service.selfSelect({ band: "B2", idempotencyKey: "initial-choice" }), result);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/language-learning/level-test/self-selection");
  assert.equal(calls[0][1].method, "POST");
  assert.deepEqual(JSON.parse(calls[0][1].body), { band: "B2", idempotencyKey: "initial-choice" });
});

test("the service propagates a failed write without an automatic second request", async () => {
  // 準備・実行・検証: 通信失敗後に別の初期化を暗黙に作らない。
  let calls = 0;
  const failure = new Error("unavailable");
  const { languageLearningLevelService: service } = loadSource(
    "../../src/services/language-learning/languageLearningLevelService.ts",
    {
      "@/lib/apiClient": { apiClient: async () => { calls += 1; throw failure; } },
      "@/services/common/responseParser": { parseResponseBody: (value) => value },
    },
  );
  await assert.rejects(service.selfSelect({ band: "B1", idempotencyKey: "same" }), (error) => error === failure);
  assert.equal(calls, 1);
});

for (const locale of ["ko", "ja", "en", "learning"]) {
  test(`self-selection controls and non-measured result notice are translated in ${locale}`, () => {
    const messages = JSON.parse(readFileSync(new URL(`../../messages/${locale}/languageLearning.json`, import.meta.url), "utf8"));
    const section = messages.LanguageLearning.levelTest.selfSelection;
    for (const key of ["title", "description", "score", "notice", "confirm", "saving", "historyLabel"]) {
      assert.equal(typeof section?.[key], "string", `Missing ${locale}: ${key}`);
      assert.ok(section[key].trim());
    }
    assert.ok(section.score.includes("{score}"));
  });
}
