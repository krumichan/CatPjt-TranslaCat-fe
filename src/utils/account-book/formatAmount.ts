import { CurrencyCode } from "@/types/accountBook";

export function formatAmount(amount: number | null | undefined, currencyCode: CurrencyCode) {
    const safeAmount =
        typeof amount === "number" && Number.isFinite(amount) ? amount : 0;

    return new Intl.NumberFormat(currencyCode === "JPY" ? "ja-JP" : "ko-KR", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
    }).format(safeAmount);
}