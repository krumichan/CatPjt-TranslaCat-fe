import type { CurrencyCode } from "@/types/accountBook";

function getLocaleByCurrencyCode(currencyCode: CurrencyCode) {
    switch (currencyCode) {
        case "JPY":
            return "ja-JP";
        case "KRW":
            return "ko-KR";
        case "USD":
            return "en-US";
        default:
            return "en-US";
    }
}

export function formatAmount(
    amount: number | string | null | undefined,
    currencyCode: CurrencyCode,
    decimalPlaces?: number,
) {
    const safeAmount =
        typeof amount === "string" && /^-?\d+(?:\.\d+)?$/.test(amount)
            ? amount
            : typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
    const precision = Number.isInteger(decimalPlaces) && decimalPlaces! >= 0 && decimalPlaces! <= 8
        ? { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces }
        : {};

    try {
        const formatter = new Intl.NumberFormat(getLocaleByCurrencyCode(currencyCode), {
            style: "currency",
            currency: currencyCode,
            ...precision,
        });
        // Intl accepts decimal strings without a lossy intermediate Number conversion.
        return (formatter.format as (value: number | string) => string)(safeAmount);
    } catch {
        return `${currencyCode} ${safeAmount.toLocaleString()}`;
    }
}
