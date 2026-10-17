import assert from "node:assert/strict";
import { test } from "node:test";

import {
    WEB_AI_AREA_GROUPS,
    applyWebAiLanguageSettings,
    buildWebAiPrompt,
    createWebAiSchedule,
    isWebAiAreaCode,
    isWebAiSelectableAreaCode,
    readWebAiSchedules,
    resolveWebAiKeywords,
    validateWebAiSchedule,
    writeWebAiSchedules,
} from "../../src/features/language-learning/web-ai/index.ts";

const labels = Object.fromEntries(
    WEB_AI_AREA_GROUPS.flatMap((group) => group.areas.map((code) => [code, code])),
);

function validSchedule(overrides = {}) {
    return {
        ...createWebAiSchedule({
            originLanguage: "ko",
            learningLanguage: "ja",
            timezone: "Asia/Tokyo",
        }),
        name: "일본어 실무 작문",
        areas: [
            { code: "WRITING_TRANSLATION", easy: 1, standard: 1, hard: 1 },
            { code: "WRITING_GUIDED", easy: 0, standard: 2, hard: 0 },
        ],
        focus: "일본 고객과의 요건정의 회의",
        ...overrides,
    };
}

function withMockStorage(storage, action) {
    const prior = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: { localStorage: storage },
    });
    try {
        return action();
    } finally {
        if (prior) Object.defineProperty(globalThis, "window", prior);
        else delete globalThis.window;
    }
}

test("학습 영역은 상위 4개 그룹과 선택 가능한 실제 학습 유형 12개로 구성된다", () => {
    // 준비 / 실행
    const groups = WEB_AI_AREA_GROUPS;
    const codes = groups.flatMap((group) => group.areas);

    // 검증
    assert.deepEqual(groups.map((group) => group.areas.length), [3, 3, 3, 3]);
    assert.equal(codes.length, 12);
    assert.equal(new Set(codes).size, 12);
    for (const group of groups) {
        assert.equal(group.areas.includes(group.domain), false);
        assert.equal(isWebAiAreaCode(group.domain), true);
        assert.equal(isWebAiSelectableAreaCode(group.domain), false);
        for (const code of group.areas) assert.equal(isWebAiSelectableAreaCode(code), true);
    }
});

test("새 계획은 언어 쌍과 시간대를 가져오고 피드백 언어는 원문 언어로 시작한다", () => {
    // 준비 / 실행
    const schedule = createWebAiSchedule({
        originLanguage: "en",
        learningLanguage: "ja",
        timezone: "Asia/Tokyo",
    });

    // 검증
    assert.ok(schedule.id);
    assert.equal(schedule.originLanguage, "en");
    assert.equal(schedule.learningLanguage, "ja");
    assert.equal(schedule.feedbackLanguage, "en");
    assert.equal(schedule.timezone, "Asia/Tokyo");
    assert.equal(schedule.time, "18:00");
    assert.equal(schedule.recurrence, "DAILY");
    assert.equal(schedule.keywordMode, "DEFAULT");
    assert.deepEqual(schedule.keywords, []);
});

test("공통 설명·피드백 언어를 새 계획과 기존 계획의 프롬프트에 적용한다", () => {
    // 준비: 과거 계획에는 현재 공통 설정과 다른 언어가 남아 있다.
    const settings = { originLanguage: "ko", learningLanguage: "ja", feedbackLanguage: "en" };
    const legacy = validSchedule({ originLanguage: "en", learningLanguage: "fr", feedbackLanguage: "fr" });

    // 실행: 새 계획 생성과 기존 계획 복사 모두 같은 공통 언어 설정을 사용한다.
    const created = createWebAiSchedule({ ...settings, timezone: "Asia/Tokyo" });
    const applied = applyWebAiLanguageSettings(legacy, settings);
    const prompt = buildWebAiPrompt(applied, "ko", labels);

    // 검증: 기존 초안의 언어를 덮어써도 원본 객체나 문제 구성은 변경하지 않는다.
    assert.equal(created.feedbackLanguage, "en");
    assert.equal(applied.originLanguage, "ko");
    assert.equal(applied.learningLanguage, "ja");
    assert.equal(applied.feedbackLanguage, "en");
    assert.deepEqual(applied.areas, legacy.areas);
    assert.equal(legacy.originLanguage, "en");
    assert.equal(legacy.learningLanguage, "fr");
    assert.equal(legacy.feedbackLanguage, "fr");
    assert.match(prompt, /원문 언어: 한국어 \(ko\)/);
    assert.match(prompt, /학습 언어: 일본어 \(ja\)/);
    assert.match(prompt, /설명과 피드백 언어: 영어 \(en\)/);
});

test("공통 언어 설정에 시간대가 포함되어도 계획에서 정한 출제 시간대는 유지한다", () => {
    // 준비: 기본 설정 조회 결과에는 언어 외에 시간대가 함께 들어 있다.
    const schedule = validSchedule({ timezone: "Asia/Tokyo" });
    const settings = {
        originLanguage: "en",
        learningLanguage: "ja",
        feedbackLanguage: "ko",
        timezone: "UTC",
    };

    // 실행
    const applied = applyWebAiLanguageSettings(schedule, settings);

    // 검증: 공통 언어만 반영하고 계획별 일정은 바꾸지 않는다.
    assert.equal(applied.originLanguage, "en");
    assert.equal(applied.feedbackLanguage, "ko");
    assert.equal(applied.timezone, "Asia/Tokyo");
    assert.equal(schedule.timezone, "Asia/Tokyo");
});

test("계획별 키워드 선택과 반환값 변경은 기본 키워드나 다른 계획에 영향을 주지 않는다", () => {
    // 준비: 공통 주제와 두 계획의 개별 주제를 서로 다르게 둔다.
    const defaults = [{ key: "system:travel", text: "여행", canonicalKey: "travel" }];
    const first = validSchedule({
        keywordMode: "CUSTOM",
        keywords: [{ key: "custom:requirements", text: "요건정의", canonicalKey: null }],
    });
    const second = validSchedule({
        id: "second-plan",
        keywordMode: "CUSTOM",
        keywords: [{ key: "system:meeting", text: "고객 회의", canonicalKey: "meeting" }],
    });
    const initialDefaults = structuredClone(defaults);
    const initialFirst = structuredClone(first.keywords);
    const initialSecond = structuredClone(second.keywords);

    // 실행: 프롬프트용으로 반환된 키워드를 변경해도 저장된 선택까지 바뀌지 않아야 한다.
    const firstResolved = resolveWebAiKeywords(first, defaults);
    const secondResolved = resolveWebAiKeywords(second, defaults);
    const defaultResolved = resolveWebAiKeywords(validSchedule(), defaults);
    firstResolved[0].text = "반환값만 수정";
    firstResolved.push({ key: "extra", text: "추가 주제", canonicalKey: null });
    defaultResolved[0].text = "기본 반환값만 수정";

    // 검증
    assert.deepEqual(defaults, initialDefaults);
    assert.deepEqual(first.keywords, initialFirst);
    assert.deepEqual(second.keywords, initialSecond);
    assert.deepEqual(secondResolved, initialSecond);
    assert.notStrictEqual(secondResolved[0], second.keywords[0]);
});

test("기본 키워드는 최신 공통 선택을 따르고 직접 선택한 계획은 자기 주제만 사용한다", () => {
    // 준비: 이전에 직접 고른 값이 남아 있어도 DEFAULT 모드에서는 공통 선택을 따른다.
    const defaults = [{ key: "system:travel", text: "여행", canonicalKey: "travel" }];
    const updatedDefaults = [{ key: "system:news", text: "뉴스", canonicalKey: "news" }];
    const keywords = [{ key: "custom:requirements", text: "요건정의", canonicalKey: null }];
    const inherited = validSchedule({ keywordMode: "DEFAULT", keywords });
    const custom = validSchedule({ keywordMode: "CUSTOM", keywords });

    // 실행
    const inheritedPrompt = buildWebAiPrompt(inherited, "ko", labels, defaults);
    const changedPrompt = buildWebAiPrompt(inherited, "ko", labels, updatedDefaults);
    const customPrompt = buildWebAiPrompt(custom, "ko", labels, updatedDefaults);

    // 검증: 선호 상황 문자열과 구분해 출제 키워드 행에 실제 선택만 포함되는지 확인한다.
    assert.match(inheritedPrompt, /출제 키워드: \["여행"\]/);
    assert.match(changedPrompt, /출제 키워드: \["뉴스"\]/);
    assert.match(customPrompt, /출제 키워드: \["요건정의"\]/);
    assert.doesNotMatch(customPrompt, /출제 키워드: .*뉴스/);
    assert.deepEqual(resolveWebAiKeywords(inherited, updatedDefaults), updatedDefaults);
    assert.deepEqual(resolveWebAiKeywords(custom, updatedDefaults), keywords);
});

test("직접 선택한 키워드가 비어 있으면 선택을 요구하고 기존 초안은 보존한다", () => {
    // 준비
    const defaults = [{ key: "system:travel", text: "여행", canonicalKey: "travel" }];
    const schedule = validSchedule({ keywordMode: "CUSTOM", keywords: [] });

    // 실행
    const issues = validateWebAiSchedule(schedule);

    // 검증
    assert.deepEqual(issues, ["PLAN_KEYWORDS_REQUIRED"]);
    assert.deepEqual(resolveWebAiKeywords(schedule, defaults), []);
    assert.throws(() => buildWebAiPrompt(schedule, "ko", labels, defaults), /PLAN_KEYWORDS_REQUIRED/);
    const stored = new Map();
    withMockStorage({ getItem: (key) => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) }, () => {
        assert.equal(writeWebAiSchedules("owner-a", [schedule]), true);
        assert.deepEqual(readWebAiSchedules("owner-a"), [schedule]);
    });
});

test("요일 또는 월별 일자를 선택해야 하며 월말 선택만으로도 유효하다", () => {
    // 준비
    const weekly = validSchedule({ recurrence: "WEEKLY", weekdays: [] });
    const monthly = validSchedule({ recurrence: "MONTHLY", monthDays: [] });

    // 실행 / 검증
    assert.deepEqual(validateWebAiSchedule(weekly), ["WEEKDAY_REQUIRED"]);
    assert.deepEqual(validateWebAiSchedule(monthly), ["MONTH_DAY_REQUIRED"]);
    assert.deepEqual(validateWebAiSchedule({ ...weekly, weekdays: [1, 3, 5] }), []);
    assert.deepEqual(validateWebAiSchedule({ ...monthly, includeLastDay: true }), []);
    assert.deepEqual(validateWebAiSchedule({ ...monthly, monthDays: [31] }), []);
    assert.deepEqual(validateWebAiSchedule({ ...monthly, monthDays: [32] }), ["MONTH_DAY_REQUIRED"]);
});

test("문제 수에 제품 상한을 두지 않고 정수·안전한 합계만 요구한다", () => {
    // 준비
    const base = validSchedule();
    const area = { code: "WRITING_TRANSLATION", easy: 100_000, standard: 0, hard: 0 };

    // 실행 / 검증
    assert.deepEqual(validateWebAiSchedule({ ...base, areas: [area] }), []);
    assert.deepEqual(validateWebAiSchedule({ ...base, areas: [{ ...area, easy: -1 }] }), ["COUNT_INVALID"]);
    assert.deepEqual(validateWebAiSchedule({ ...base, areas: [{ ...area, easy: 1.5 }] }), ["COUNT_INVALID"]);
    assert.deepEqual(validateWebAiSchedule({ ...base, areas: [{ ...area, easy: Number.MAX_SAFE_INTEGER + 1 }] }), ["COUNT_INVALID"]);
    assert.deepEqual(validateWebAiSchedule({ ...base, areas: [{ ...area, easy: 0 }] }), ["COUNT_REQUIRED"]);
});

test("필수 항목과 중복 분야를 안정적인 코드로 보고한다", () => {
    // 준비
    const base = validSchedule();
    const duplicate = [base.areas[0], { ...base.areas[0] }];

    // 실행 / 검증
    assert.deepEqual(validateWebAiSchedule({ ...base, name: "  " }), ["NAME_REQUIRED"]);
    assert.deepEqual(validateWebAiSchedule({ ...base, feedbackLanguage: "" }), ["LANGUAGES_REQUIRED"]);
    assert.deepEqual(validateWebAiSchedule({ ...base, learningLanguage: "ko" }), ["SAME_LANGUAGE"]);
    assert.deepEqual(validateWebAiSchedule({ ...base, timezone: "Mars/Olympus" }), ["TIMEZONE_INVALID"]);
    assert.deepEqual(validateWebAiSchedule({ ...base, time: "25:20" }), ["TIME_INVALID"]);
    assert.deepEqual(validateWebAiSchedule({ ...base, areas: duplicate }), ["AREA_REQUIRED"]);
});

test("브라우저 임시 계획은 사용자별로 분리하고 손상 항목을 건너뛴다", () => {
    // 준비
    const values = new Map();
    const storage = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
    };
    const own = validSchedule();

    // 실행 / 검증
    withMockStorage(storage, () => {
        assert.equal(writeWebAiSchedules("owner-a", [own]), true);
        assert.deepEqual(readWebAiSchedules("owner-a"), [own]);
        assert.deepEqual(readWebAiSchedules("owner-b"), []);

        const key = [...values.keys()][0];
        const saved = JSON.parse(values.get(key));
        saved.schedules.push({ ...own, id: "damaged", areas: [{ code: "UNKNOWN", easy: 1, standard: 0, hard: 0 }] });
        saved.schedules.push({ ...own, id: "invalid-timezone", timezone: "Mars/Olympus" });
        values.set(key, JSON.stringify(saved));
        assert.deepEqual(readWebAiSchedules("owner-a"), [own]);

        values.set(key, "{broken-json");
        assert.deepEqual(readWebAiSchedules("owner-a"), []);
    });
});

test("키워드 저장은 계획별 선택을 보존하고 예전 계획에 기본 키워드 모드를 적용한다", () => {
    // 준비: 기존 v1 저장 형식에는 keywordMode와 keywords가 없다.
    const values = new Map();
    const storage = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
    };
    const current = validSchedule({
        id: "custom-plan",
        keywordMode: "CUSTOM",
        keywords: [{ key: "custom:requirements", text: "요건정의", canonicalKey: null }],
    });
    const legacy = validSchedule({ id: "legacy-plan" });
    delete legacy.keywordMode;
    delete legacy.keywords;

    withMockStorage(storage, () => {
        // 실행: 정상 저장 자료에 과거 계획을 합쳐 같은 버전에서 복구한다.
        assert.equal(writeWebAiSchedules("owner", [current]), true);
        const key = [...values.keys()][0];
        const saved = JSON.parse(values.get(key));
        saved.schedules.push(legacy);
        values.set(key, JSON.stringify(saved));
        const restored = readWebAiSchedules("owner");

        // 검증: 개별 선택은 보존하고 과거 계획은 최신 공통 키워드를 따르는 모드로 이행한다.
        assert.deepEqual(restored, [current, { ...legacy, keywordMode: "DEFAULT", keywords: [] }]);
        assert.equal(writeWebAiSchedules("owner", restored), true);
        assert.deepEqual(readWebAiSchedules("owner"), restored);
    });
});

test("손상된 키워드를 무제한 출제로 복구하지 않고 해당 계획만 제외한다", () => {
    // 준비: 비정상 배열, 필수 값 누락, 중복 식별자와 잘못된 모드를 함께 저장한다.
    const values = new Map();
    const storage = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
    };
    const healthy = validSchedule({ id: "healthy" });
    const keyword = { key: "topic", text: "고객 회의", canonicalKey: "meeting" };
    const corruptKeywords = [
        null,
        "고객 회의",
        [null],
        [{ ...keyword, key: " " }],
        [{ ...keyword, text: 123 }],
        [{ key: "topic", text: "고객 회의" }],
        [{ ...keyword, canonicalKey: false }],
        [keyword, { ...keyword }],
    ];

    withMockStorage(storage, () => {
        // 실행
        assert.equal(writeWebAiSchedules("owner", [healthy]), true);
        const key = [...values.keys()][0];
        const saved = JSON.parse(values.get(key));
        saved.schedules.push(...corruptKeywords.map((keywords, index) => ({
            ...healthy,
            id: `corrupt-${index}`,
            keywordMode: "CUSTOM",
            keywords,
        })));
        saved.schedules.push({ ...healthy, id: "invalid-mode", keywordMode: "UNKNOWN" });
        values.set(key, JSON.stringify(saved));
        const restored = readWebAiSchedules("owner");

        // 검증: 다른 정상 계획은 계속 조회되고 잘못된 선택을 저장하려 해도 실패한다.
        assert.deepEqual(restored, [healthy]);
        assert.equal(writeWebAiSchedules("owner", [{ ...healthy, keywordMode: "CUSTOM", keywords: [keyword, keyword] }]), false);
        assert.equal(writeWebAiSchedules("owner", [{ ...healthy, keywordMode: "CUSTOM", keywords: [null] }]), false);
    });
});

test("기존 '분야 전체' 문제 수를 보존하고 사용자가 세부 유형으로 옮기기 전까지 출제를 막는다", () => {
    // 준비: 출시 전 저장된 상위 분야 문제 수와 신규 세부 유형 문제 수를 함께 둔다.
    const values = new Map();
    const storage = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
    };
    const legacy = validSchedule({
        areas: [
            { code: "WRITING", easy: 2, standard: 1, hard: 0 },
            { code: "WRITING_GUIDED", easy: 0, standard: 1, hard: 0 },
        ],
    });
    const another = validSchedule({ id: "new-schedule" });

    // 실행: 상위 분야의 유형은 모호하므로 자동 분배하지 않고 그대로 복구한다.
    withMockStorage(storage, () => {
        assert.equal(writeWebAiSchedules("owner", [legacy]), true);
        const restored = readWebAiSchedules("owner");
        assert.deepEqual(restored, [legacy]);
        assert.equal(restored[0].areas.reduce((sum, area) => sum + area.easy + area.standard + area.hard, 0), 4);
        assert.equal(writeWebAiSchedules("owner", [legacy, another]), true);
        assert.deepEqual(readWebAiSchedules("owner"), [legacy, another]);
    });

    // 검증: 사용자가 상위 분야를 지우고 원하는 세부 유형에 수를 재배치해야 한다.
    assert.deepEqual(validateWebAiSchedule(legacy), ["LEGACY_AREA_REQUIRES_REVIEW"]);
    assert.throws(() => buildWebAiPrompt(legacy, "ko", labels), /LEGACY_AREA_REQUIRES_REVIEW/);
    const resolved = {
        ...legacy,
        areas: [
            { code: "WRITING_TRANSLATION", easy: 2, standard: 1, hard: 0 },
            { code: "WRITING_GUIDED", easy: 0, standard: 1, hard: 0 },
        ],
    };
    assert.deepEqual(validateWebAiSchedule(resolved), []);
    assert.match(buildWebAiPrompt(resolved, "ko", labels), /총 4문제/);
});

test("저장 불가 또는 잘못된 계획은 성공으로 표시하지 않는다", () => {
    // 준비
    const schedule = validSchedule();
    const deniedStorage = {
        getItem: () => null,
        setItem: () => { throw new Error("quota exceeded"); },
    };

    // 실행 / 검증
    assert.equal(withMockStorage(deniedStorage, () => writeWebAiSchedules("owner", [schedule])), false);
    assert.equal(withMockStorage(deniedStorage, () => writeWebAiSchedules("owner", [{ ...schedule, name: "" }])), false);
    assert.equal(writeWebAiSchedules("owner", [schedule]), false);
    assert.deepEqual(readWebAiSchedules("owner"), []);
});

test("복사 프롬프트는 5문제 분배·요일·언어·무제한 풀이와 상세 피드백을 담는다", () => {
    // 준비
    const schedule = validSchedule({ recurrence: "WEEKLY", weekdays: [1, 4] });

    // 실행
    const prompt = buildWebAiPrompt(schedule, "ko", labels);

    // 검증
    assert.match(prompt, /매주 월·목요일 18:00 \(Asia\/Tokyo\)/);
    assert.match(prompt, /원문 언어: 한국어 \(ko\)/);
    assert.match(prompt, /학습 언어: 일본어 \(ja\)/);
    assert.match(prompt, /총 5문제/);
    assert.match(prompt, /WRITING_TRANSLATION.*쉬움 1, 적정 1, 어려움 1/);
    assert.match(prompt, /일본 고객과의 요건정의 회의/);
    assert.match(prompt, /풀이 시간제한은 없습니다/);
    assert.match(prompt, /작성 표현 \| 권장 표현 \| 이유/);
    assert.doesNotMatch(prompt, /API 키|이메일|TranslaCat/);
});

test("세부 유형만 프롬프트에 넣고 월말·없는 날짜를 설명한다", () => {
    // 준비
    const schedule = validSchedule({
        recurrence: "MONTHLY",
        monthDays: [31],
        includeLastDay: true,
        areas: [
            { code: "WRITING_TRANSLATION", easy: 2, standard: 0, hard: 0 },
            { code: "WRITING_GUIDED", easy: 0, standard: 3, hard: 0 },
        ],
    });

    // 실행
    const prompt = buildWebAiPrompt(schedule, "ja", labels);

    // 검증
    assert.match(prompt, /毎月31日・月末日 18:00/);
    assert.match(prompt, /存在しない日付には実行しない/);
    assert.match(prompt, /合計 5 問/);
    assert.match(prompt, /詳細形式ごとに指定した難易度別の数/);
    assert.doesNotMatch(prompt, /上位分野/);
    assert.match(prompt, /音声入出力が使えない場合/);
    assert.equal(buildWebAiPrompt(schedule, "learning", labels), prompt);
    assert.throws(() => buildWebAiPrompt({ ...schedule, name: "" }, "ko", labels), /NAME_REQUIRED/);
});

test("영어 UI 프롬프트는 일본어 학습 쌍과 문제 수·월말 정책을 그대로 안내한다", () => {
    // 준비: UI 언어와 학습 언어를 다르게 두고 중복 날짜도 함께 전달한다.
    const schedule = validSchedule({
        name: "Japanese writing practice",
        focus: "Discussing requirements with a client",
        originLanguage: "ko",
        learningLanguage: "ja",
        feedbackLanguage: "ko",
        recurrence: "MONTHLY",
        monthDays: [31, 15, 31],
        includeLastDay: true,
    });
    const original = structuredClone(schedule);

    // 실행
    const prompt = buildWebAiPrompt(schedule, "en", labels);
    const learningPrompt = buildWebAiPrompt(schedule, "learning", labels);

    // 검증: 안내만 영어이며 답안·피드백 언어와 실제 문제 배분은 바꾸지 않는다.
    assert.match(prompt, /Schedule: Every month on 15, 31, the last day at 18:00 \(Asia\/Tokyo\)/);
    assert.match(prompt, /Skip dates that do not exist in a month/);
    assert.match(prompt, /Use the last day only when selected separately/);
    assert.match(prompt, /run once when a selected date and the last day coincide/);
    assert.match(prompt, /Source language: Korean \(ko\)/);
    assert.match(prompt, /Learning language: Japanese \(ja\)\. Require main answers in this language/);
    assert.match(prompt, /Explanation and feedback language: Korean \(ko\)/);
    assert.match(prompt, /Total exercises: 5\./);
    assert.match(prompt, /\[WRITING_TRANSLATION\]: easy 1, standard 1, hard 1 \(total 3\)/);
    assert.match(prompt, /\[WRITING_GUIDED\]: easy 0, standard 2, hard 0 \(total 2\)/);
    assert.match(prompt, /There is no time limit/);
    assert.match(prompt, /Do not claim to measure actual listening or pronunciation ability/);
    assert.doesNotMatch(prompt, /[\uAC00-\uD7AF\u3040-\u30FF\u3400-\u9FFF]/u);
    assert.equal(learningPrompt, buildWebAiPrompt(schedule, "ja", labels));
    assert.match(learningPrompt, /学習言語：日本語 \(ja\)/);
    assert.deepEqual(schedule, original);
});
