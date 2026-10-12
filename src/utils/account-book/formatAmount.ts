import type { CurrencyCode } from "@/types/accountBook";

type MoneyValue = number | string | null | undefined;

function getLocaleByCurrencyCode(currencyCode: CurrencyCode) {
    switch (currencyCode) {
        case "JPY": return "ja-JP";
        case "KRW": return "ko-KR";
        default: return "en-US";
    }
}

function validAmount(amount: MoneyValue): string | number | null {
    if (typeof amount === "string" && /^-?\d+(?:\.\d+)?$/.test(amount.trim()))
        return amount.trim();
    return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}

function fractionDigits(currencyCode: CurrencyCode, decimalPlaces?: number): number {
    if (Number.isInteger(decimalPlaces) && decimalPlaces! >= 0 && decimalPlaces! <= 8)
        return decimalPlaces!;
    try {
        return new Intl.NumberFormat(getLocaleByCurrencyCode(currencyCode), {
            style: "currency", currency: currencyCode,
        }).resolvedOptions().maximumFractionDigits ?? 8;
    } catch {
        // 통화 미확인 후보도 원래 숫자를 볼 수 있게 소수 정밀도를 보존한다.
        return 8;
    }
}

export function formatAmountNumber(amount: MoneyValue, currencyCode: CurrencyCode, decimalPlaces?: number): string {
    const value = validAmount(amount);
    if (value == null)
        return "—";
    const formatter = new Intl.NumberFormat(getLocaleByCurrencyCode(currencyCode), {
        minimumFractionDigits: 0,
        maximumFractionDigits: fractionDigits(currencyCode, decimalPlaces),
    });
    // Decimal 문자열을 Number로 바꾸지 않아 큰 금액의 자릿수를 잃지 않는다.
    return (formatter.format as (value: number | string) => string)(value);
}

export function formatAmount(amount: MoneyValue, currencyCode: CurrencyCode, decimalPlaces?: number): string {
    const value = validAmount(amount);
    if (value == null)
        return "—";

    // 통화별 소수 단위를 적용하되 표시를 위한 뒤쪽 0은 채우지 않는다.
    try {
        const formatter = new Intl.NumberFormat(getLocaleByCurrencyCode(currencyCode), {
            style: "currency", currency: currencyCode,
            minimumFractionDigits: 0,
            maximumFractionDigits: fractionDigits(currencyCode, decimalPlaces),
        });
        return (formatter.format as (value: number | string) => string)(value);
    } catch {
        return formatReceiptAmount(value, currencyCode, decimalPlaces);
    }
}

/** 원통화/환산액을 구분하는 영수증 화면은 숫자 뒤에 ISO 통화 코드를 붙인다. */
export function formatReceiptAmount(amount: MoneyValue, currencyCode: CurrencyCode, decimalPlaces?: number): string {
    const number = formatAmountNumber(amount, currencyCode, decimalPlaces);
    return currencyCode ? `${number} ${currencyCode}` : number;
}

/** 환율은 금액의 소수 단위로 반올림하지 않고 유효한 모든 자릿수를 보여 준다. */
export function formatExchangeRate(rate: MoneyValue): string {
    const value = validAmount(rate);
    if (value == null)
        return "—";
    const [whole, fraction] = String(value).split(".");
    const significant = fraction?.replace(/0+$/, "");
    return significant ? `${whole}.${significant}` : whole;
}
