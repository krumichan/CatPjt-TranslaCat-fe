import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function dashboardHarness() {
    const source = readFileSync(new URL("../../src/hooks/language-learning/useLanguageLearningDashboardPageController.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const cache = new Map();
    const requests = [];
    const mutations = [];
    const state = ["30d", "ALL", null];
    let stateIndex = 0;
    let activeQueries = [];
    const entry = {
        setting: { configured: true, originLanguage: "ko", learningLanguage: "ja", pendingLearningLanguage: "en" },
        levelStatus: { profileState: "ACTIVE" },
        isLoading: false,
        reload: async () => {},
    };

    // 실제 controller를 불러오되, 요청의 완료 순서와 키별 캐시만 테스트에서 제어한다.
    function request(service, args = []) {
        let resolve;
        const promise = new Promise((complete) => { resolve = complete; });
        requests.push({ service, args, resolve });
        return promise;
    }
    const modules = {
        react: {
            useCallback: (callback) => callback,
            useState: () => {
                const index = stateIndex++;
                return [state[index], (value) => { state[index] = value; }];
            },
        },
        "@/hooks/language-learning/useLanguageLearningEntryState": { useLanguageLearningEntryState: () => entry },
        "@/hooks/useQuery": { useQuery: (options) => {
            activeQueries.push(options);
            if (!options.keys) return { data: undefined, isLoading: false, isValidating: false };
            const key = JSON.stringify(options.keys);
            if (!cache.has(key)) {
                const record = { data: undefined, pending: true };
                cache.set(key, record);
                record.promise = options.fetcher(...options.keys).then((data) => {
                    record.data = data;
                    record.pending = false;
                });
            }
            const record = cache.get(key);
            return {
                data: record.data,
                isLoading: record.pending && record.data === undefined,
                isValidating: record.pending,
                mutate: async () => { mutations.push(options.keys); return record.data; },
            };
        } },
        "@/services/language-learning/languageLearningDashboardService": {
            languageLearningDashboardService: { get: (...args) => request("dashboard", args) },
        },
        "@/services/language-learning/languageLearningProfileService": {
            languageLearningProfileService: { get: () => request("profile") },
        },
        "@/services/language-learning/languageLearningLevelService": {
            languageLearningLevelService: { getHistory: () => request("history") },
        },
        "@/services/language-learning/listeningService": { listeningService: { dismissRecommendation: async () => {} } },
    };
    const exports = {};
    vm.runInNewContext(compiled, { exports, require: (name) => {
        assert.ok(name in modules, `Unexpected dependency: ${name}`);
        return modules[name];
    } });

    return {
        entry, requests, mutations, cache,
        render() {
            stateIndex = 0;
            activeQueries = [];
            return exports.useLanguageLearningDashboardPageController();
        },
        queries: () => activeQueries,
        async resolveBatch(offset, language, score) {
            requests[offset].resolve({ learningLanguage: language, integratedAbility: { overall: score } });
            requests[offset + 1].resolve({ baseLevelScore: score });
            requests[offset + 2].resolve([]);
            await Promise.all([...cache.values()].slice(offset, offset + 3).map((record) => record.promise));
        },
    };
}

test("예약 영어는 기존 캐시를 유지하고 실제 활성 언어쌍 변경 뒤에는 새 점수와 프로필을 기다린다", async () => {
    // 준비: 아직 적용되지 않은 영어 예약은 현재 일본어 학습을 바꾸지 않는다.
    const harness = dashboardHarness();
    harness.render();
    await harness.resolveBatch(0, "ja", 95);
    const japanese = harness.render();
    assert.equal(japanese.dashboard.integratedAbility.overall, 95);
    const japaneseKeys = harness.queries().map(({ keys }) => JSON.stringify(keys));

    // 실행: 서버가 다음 학습일의 활성 언어를 영어로 승격한 뒤 다시 렌더링한다.
    harness.entry.setting = { ...harness.entry.setting, learningLanguage: "en", pendingLearningLanguage: null };
    const englishLoading = harness.render();

    // 검증: 전 언어의 95점을 보여 주지 않고 언어별 세 읽기 캐시를 새로 사용한다.
    assert.equal(englishLoading.dashboard, null);
    assert.equal(englishLoading.profile, null);
    assert.equal(englishLoading.isLoadingData, true);
    assert.equal(englishLoading.isLoadingProfile, true);
    assert.equal(harness.requests.length, 6);
    assert.ok(harness.queries().every(({ keys, config }, index) => JSON.stringify(keys) !== japaneseKeys[index] && config.keepPreviousData === false));
    await harness.resolveBatch(3, "en", 62);
    const english = harness.render();
    assert.equal(english.dashboard.integratedAbility.overall, 62);
    assert.equal(english.profile.baseLevelScore, 62);
});

test("늦게 도착한 일본어 응답은 영어 차트와 프로필을 덮어쓰지 않고 새로고침도 현재 키만 갱신한다", async () => {
    // 준비: 일본어 요청을 보류한 채 영어 요청부터 완료한다.
    const harness = dashboardHarness();
    harness.render();
    harness.entry.setting = { ...harness.entry.setting, learningLanguage: "en" };
    harness.render();
    await harness.resolveBatch(3, "en", 62);

    // 실행: 기존 일본어 응답이 나중에 도착하고 현재 화면에서 다시 조회한다.
    await harness.resolveBatch(0, "ja", 95);
    const english = harness.render();
    await english.reloadData();
    await english.reloadProfile();
    await english.dismissRecommendation(1);

    // 검증: 예전 캐시는 보존하되 영어 결과와 영어 키의 bound mutator만 사용한다.
    assert.equal(english.dashboard.learningLanguage, "en");
    assert.equal(english.profile.baseLevelScore, 62);
    assert.equal(english.isLoadingData, false);
    assert.equal(harness.cache.size, 6);
    assert.ok(harness.mutations.length >= 6);
    assert.ok(harness.mutations.every((keys) => keys.at(-2) === "ko" && keys.at(-1) === "en"));
});

test("같은 언어쌍의 기간·출처 필터는 API 인자를 유지하고 프로필 캐시를 공유한다", async () => {
    // 준비: 영어의 30일 전체 결과를 읽는다.
    const harness = dashboardHarness();
    harness.entry.setting.learningLanguage = "en";
    harness.render();
    await harness.resolveBatch(0, "en", 62);
    const controller = harness.render();

    // 실행: 7일·작문으로 필터를 바꾼다.
    controller.setPeriod("7d");
    controller.setSource("WRITING");
    const filtered = harness.render();

    // 검증: 추가 요청은 대시보드 하나이며 언어 코드를 기간 인자로 보내지 않는다.
    assert.equal(harness.requests.length, 4);
    assert.equal(harness.requests[3].service, "dashboard");
    assert.equal(JSON.stringify(harness.requests[3].args), JSON.stringify(["7d", "WRITING"]));
    assert.equal(filtered.isLoadingData, true);
    assert.equal(filtered.profile, null);
    harness.requests[3].resolve({ learningLanguage: "en", integratedAbility: { overall: 70 } });
    await Promise.resolve();
    const complete = harness.render();
    assert.equal(complete.dashboard.integratedAbility.overall, 70);
    assert.equal(complete.profile.baseLevelScore, 62);
    assert.equal(harness.requests.length, 4);
});

test("현재 영어 키에 언어가 다른 DTO가 들어와도 이전 점수와 프로필을 표시하지 않는다", async () => {
    // 준비: 응답의 언어 증거가 현재 설정과 다른 상황을 만든다.
    const harness = dashboardHarness();
    harness.entry.setting.learningLanguage = "en";
    harness.render();

    // 실행: 영어 조회에 일본어 응답이 들어온다.
    await harness.resolveBatch(0, "ja", 95);
    const mismatched = harness.render();

    // 검증: 다른 언어 점수는 반환하지 않고 기존 오류·다시 읽기 화면을 사용한다.
    assert.equal(mismatched.dashboard, null);
    assert.equal(mismatched.profile, null);
    assert.equal(mismatched.isLoadingData, false);
});

test("학습 언어가 같아도 모국어가 바뀌면 대시보드와 프로필을 새 언어쌍으로 읽는다", async () => {
    // 준비: 한국어 원문으로 영어를 배우던 결과를 보존한다.
    const harness = dashboardHarness();
    harness.entry.setting.learningLanguage = "en";
    harness.render();
    await harness.resolveBatch(0, "en", 62);

    // 실행: 학습 언어는 영어로 유지하고 모국어만 일본어로 바꾼다.
    harness.entry.setting.originLanguage = "ja";
    const newPair = harness.render();

    // 검증: 같은 영어라는 이유로 이전 언어쌍의 프로필을 사용하지 않는다.
    assert.equal(newPair.dashboard, null);
    assert.equal(newPair.profile, null);
    assert.equal(newPair.isLoadingData, true);
    assert.equal(harness.requests.length, 6);
    assert.ok(harness.queries().every(({ keys }) => keys.at(-2) === "ja" && keys.at(-1) === "en"));
});
