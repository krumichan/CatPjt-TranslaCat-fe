import { CurrencyCode } from "@/types/accountBook";

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
    amount: number | null | undefined,
    currencyCode: CurrencyCode
) {
    const safeAmount =
        typeof amount === "number" && Number.isFinite(amount) ? amount : 0;

    try {
        return new Intl.NumberFormat(getLocaleByCurrencyCode(currencyCode), {
            style: "currency",
            currency: currencyCode,
            maximumFractionDigits: 0,
        }).format(safeAmount);
    } catch {
        return `${currencyCode} ${safeAmount.toLocaleString()}`;
    }
}