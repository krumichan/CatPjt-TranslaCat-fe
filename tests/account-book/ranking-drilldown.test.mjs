import assert from "node:assert/strict";
import test from "node:test";
import { buildPieChartSelections } from "../../src/utils/account-book/expenseRanking.ts";

test("chart drilldown distinguishes a literal other category from the combined slice", () => {
    // 준비: 표시명이 같은 실제 카테고리와 합산 항목을 만든다.
    const items = [
        { name: "기타", groupKey: "기타", amount: "60", transactionCount: 1, percentage: 60 },
        { name: "생활", groupKey: "생활", amount: "25", transactionCount: 2, percentage: 25 },
        { name: "미분류", groupKey: null, amount: "15", transactionCount: 3, percentage: 15 },
    ];

    // 실행
    const result = buildPieChartSelections(items, "100", 2, "기타");

    // 검증: 묶음에는 해당 구성원의 키만 들어가며 원본을 바꾸지 않는다.
    assert.equal(result[0].name, result[1].name);
    assert.deepEqual(result[0].groupKeys, ["기타"]);
    assert.deepEqual(result[1].groupKeys, ["생활", null]);
    assert.deepEqual(result[1].excludedGroupKeys, ["기타"]);
    assert.equal(result[1].amount, "40");
    assert.equal(result[1].transactionCount, 5);
    assert.equal(result[1].percentage, 40);
    assert.equal(items.length, 3);
    assert.equal(items[1].name, "생활");
});

test("combined chart filter stays bounded for more than 500 merchant groups", () => {
    // 준비
    const items = Array.from({ length: 600 }, (_, index) => ({
        name: `Store ${index}`, groupKey: `store-${index}`, amount: "1", transactionCount: 1, percentage: 0.17,
    }));

    // 실행
    const result = buildPieChartSelections(items, "600", 8, "기타");
    const combined = result.at(-1);

    // 검증: 수백 개의 구성원을 보존하되 서버 조회는 7개 제외 키만 보낸다.
    assert.equal(combined.groupKeys.length, 593);
    assert.equal(combined.excludedGroupKeys.length, 7);
    assert.equal(combined.amount, "593");
    assert.equal(combined.transactionCount, 593);
});

test("chart drilldown uses normalized merchant keys and preserves empty and null keys", () => {
    // 준비
    const items = [
        { name: "Ａｍａｚｏｎ", groupKey: "amazon", amount: "1", transactionCount: 1, percentage: 25 },
        { name: "빈 분류", groupKey: "", amount: "1", transactionCount: 1, percentage: 25 },
        { name: "미분류", groupKey: null, amount: "1", transactionCount: 1, percentage: 25 },
        { name: "Legacy", amount: "1", transactionCount: 1, percentage: 25 },
    ];

    // 실행
    const result = buildPieChartSelections(items, "4", 8, "기타");

    // 검증
    assert.deepEqual(result.map(item => item.groupKeys), [["amazon"], [""], [null], ["Legacy"]]);
    assert.deepEqual(buildPieChartSelections([], "0", 8, "기타"), []);
});
