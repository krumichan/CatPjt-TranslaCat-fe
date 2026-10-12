import assert from "node:assert/strict";
import test from "node:test";
import * as money from "../../src/utils/account-book/formatAmount.ts";

test("JPY and KRW omit persisted fractional padding", () => {
    // 준비 / 실행 / 검증: 화면용 문자열만 정리하고 원본 Decimal 문자열은 그대로 둔다.
    const amount = "10606.00000000";
    assert.equal(money.formatAmount(amount, "JPY"), "￥10,606");
    assert.equal(money.formatReceiptAmount(amount, "JPY"), "10,606 JPY");
    assert.equal(money.formatReceiptAmount("1697.00000000", "KRW"), "1,697 KRW");
    assert.equal(amount, "10606.00000000");
});

test("shared money displays trim zero padding and preserve currency fractions", () => {
    // 준비 / 실행 / 검증: 세 자리 통화와 설정된 자릿수도 임의로 정수화하지 않는다.
    assert.equal(money.formatAmount("12.00000000", "USD"), "$12");
    assert.equal(money.formatAmount("12.30000000", "USD"), "$12.3");
    assert.equal(money.formatReceiptAmount("12.34000000", "USD"), "12.34 USD");
    assert.equal(money.formatReceiptAmount("10.12500000", "KWD"), "10.125 KWD");
    assert.equal(money.formatReceiptAmount("10.10000000", "KWD"), "10.1 KWD");
    assert.equal(money.formatReceiptAmount("12.34560000", "USD", 4), "12.3456 USD");
    assert.equal(money.formatReceiptAmount("9007199254740993.12500000", "KWD"), "9,007,199,254,740,993.125 KWD");
    assert.equal(money.formatReceiptAmount("-1234.50000000", "USD"), "-1,234.5 USD");
});

test("missing money is not rendered as a fake zero", () => {
    // 준비 / 실행 / 검증: 없거나 잘못된 값은 미확인, 실제 0은 0으로 구분한다.
    for (const value of [null, undefined, "", "invalid", NaN, Infinity]) {
        assert.equal(money.formatAmount(value, "JPY"), "—");
        assert.equal(money.formatReceiptAmount(value, "JPY"), "— JPY");
    }
    assert.equal(money.formatReceiptAmount("0.00000000", "JPY"), "0 JPY");
    assert.equal(money.formatReceiptAmount("12.34000000", ""), "12.34");
});

test("exchange rates retain significant digits independently of currency minor units", () => {
    // 준비 / 실행 / 검증: 환율을 정수로 반올림하지 않고 의미 없는 뒤쪽 0만 제거한다.
    assert.equal(money.formatExchangeRate("0.000012340000"), "0.00001234");
    assert.equal(money.formatExchangeRate("148.00000000"), "148");
    assert.equal(money.formatExchangeRate("0.306640000000"), "0.30664");
    assert.equal(money.formatExchangeRate(null), "—");
});
