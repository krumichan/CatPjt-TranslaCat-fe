import assert from "node:assert/strict";
import test from "node:test";
import { decimalToUnits, unitsToDecimal, sumDecimalAmounts } from "../../src/utils/account-book/decimalMoney.ts";
import { calculateExpenseGoalStatus } from "../../src/components/account-book/detail/expense-goal/expenseGoalUtils.ts";
import { getBudgetDiff, hasMonthlyChartData } from "../../src/components/account-book/detail/monthly-chart/monthlyExpenseChartUtils.ts";
import { buildPieChartItems } from "../../src/utils/account-book/expenseRanking.ts";

test("fixed-cost display aggregation preserves fractions and large decimal strings", () => {
    assert.equal(sumDecimalAmounts(["0.1", "0.2", "10.125"]), "10.425");
    assert.equal(sumDecimalAmounts(["9007199254740993.125", "0.875"]), "9007199254740994");
    assert.equal(sumDecimalAmounts([1280, "12000"]), "13280");
    assert.equal(sumDecimalAmounts([]), "0");
});

test("decimal display units preserve signs and accept legacy exponent notation", () => {
    for (const amount of ["0", "-0.125", "0.00000001", "99999999999999999999.99999999"]) assert.equal(unitsToDecimal(decimalToUnits(amount)), amount);
    assert.equal(unitsToDecimal(decimalToUnits(1e20)), "100000000000000000000");
    assert.equal(unitsToDecimal(decimalToUnits(1e-8)), "0.00000001");
    assert.throws(() => decimalToUnits("0.000000001"));
    assert.throws(() => decimalToUnits("NaN"));
});

test("goal status calculates decimal remainders without floating-point artifacts", () => {
    const status = calculateExpenseGoalStatus("0.3", 0.1);
    assert.equal(status.normalizedGoalAmount, "0.3");
    assert.equal(status.remainingAmount, "0.2");
    assert.equal(status.exceededAmount, "0");
    assert.equal(status.usageRate, 33);
    assert.equal(status.isExceeded, false);
    assert.equal(calculateExpenseGoalStatus("10.125", 11).exceededAmount, "0.875");
    assert.equal(calculateExpenseGoalStatus(null, 1).hasGoal, false);
});

test("goal expense and remaining amounts above Number's precision remain exact", () => {
    const status = calculateExpenseGoalStatus("9007199254740994.125", "9007199254740993.001");
    assert.equal(status.normalizedGoalAmount, "9007199254740994.125");
    assert.equal(status.remainingAmount, "1.124");
    assert.equal(status.isExceeded, false);
    const over = calculateExpenseGoalStatus("9007199254740993.001", "9007199254740994.125");
    assert.equal(over.exceededAmount, "1.124");
    assert.equal(over.isExceeded, true);
});

test("monthly chart budget status uses raw decimal amounts and recognizes string zero", () => {
    const row = { year: 2026, month: 9, monthLabel: "September", incomeAmount: "0", expenseAmount: "9007199254740994.125", expenseGoalAmount: "9007199254740993.001", balance: "0" };
    assert.equal(unitsToDecimal(getBudgetDiff(row)), "1.124");
    assert.equal(hasMonthlyChartData([{ ...row, expenseAmount: "0", expenseGoalAmount: null }]), false);
});

test("ranking other slice sums exact decimal strings while percentages remain display values", () => {
    const items = [
        { name: "a", amount: "0.1", transactionCount: 1, percentage: 10 },
        { name: "b", amount: "0.2", transactionCount: 1, percentage: 20 },
        { name: "c", amount: "0.7", transactionCount: 1, percentage: 70 },
    ];
    const grouped = buildPieChartItems(items, "1", 2, "other");
    assert.equal(grouped[1].amount, "0.9");
    assert.equal(grouped[1].percentage, 90);
    assert.equal(grouped[1].transactionCount, 2);
});
