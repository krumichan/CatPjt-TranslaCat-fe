import { isPositiveDecimal } from "../decimalInput";
import type { ReceiptReviewItem } from "./types";
import type { ReceiptPaymentItem } from "@/types/accountBook";

export const PAID_TYPES = new Set([
    "CASH",
    "CREDIT_CARD",
    "DEBIT_CARD",
    "ELECTRONIC_MONEY",
    "GIFT_CARD",
    "VOUCHER",
    "OTHER_PAID",
]);

export const ZERO = BigInt(0);

export const DECIMAL_UNIT = BigInt(100000000);

export function isValidPositiveMoney(value: string): boolean {
    if (!isPositiveDecimal(value))
        return false;
    const [integerPart, fractionPart = ""] = value.trim().split(".");
    return integerPart.replace(/^0+/, "").length <= 20 && fractionPart.length <= 8;
}

export function decimalUnits(value: string | null): bigint | null {
    if (value == null || !/^\d+(?:\.\d{1,8})?$/.test(value.trim()))
        return null;
    const [whole, fraction = ""] = value.trim().split(".");
    return BigInt(whole) * DECIMAL_UNIT + BigInt(fraction.padEnd(8, "0"));
}

export function decimalText(value: bigint): string {
    const whole = value / DECIMAL_UNIT;
    const fraction = (value % DECIMAL_UNIT).toString().padStart(8, "0").replace(/0+$/, "");
    return fraction ? `${whole}.${fraction}` : whole.toString();
}

/** 購入総額と支払明細を照合し、家計簿に反映する原金額を確定する。 */
export function recalculateAmountFacts(item: ReceiptReviewItem): ReceiptReviewItem {
    const total = decimalUnits(item.purchaseTotal);
    if (total == null || total <= ZERO)
        return {
            ...item,
            originalAmount: "",
            reviewStatus: "NEEDS_REVIEW",
            amountReason: "MISSING_OR_INVALID_PURCHASE_TOTAL",
        };
    // 現金預り額とお釣りが揃っていれば、支払明細がなくても差額を購入総額と照合する。
    const tendered = decimalUnits(item.cashTendered);
    const change = decimalUnits(item.change);
    const netCash = tendered !== null && change !== null && tendered >= change ? tendered - change : null;
    if (!item.paymentBreakdown.length) {
        if (item.cashTendered?.trim() && item.change?.trim() && netCash !== total) {
            return {
                ...item,
                originalAmount: "",
                reviewStatus: "NEEDS_REVIEW",
                amountReason: "INVALID_CASH_FACTS",
            };
        }

        return {
            ...item,
            originalAmount: decimalText(total),
            reviewStatus: "READY",
            amountPolicyVersion: "receipt-book-amount-v1",
            amountReason: "PURCHASE_TOTAL_NO_PAYMENT_ALLOCATION",
        };
    }

    // 単一の現金明細で金額だけが欠けている場合、購入総額と一致した現金の差額を使う。
    const [firstPayment] = item.paymentBreakdown;
    const paymentBreakdown = item.paymentBreakdown.length === 1 && firstPayment.paymentType === "CASH"
        && !firstPayment.amount?.trim() && netCash === total
        ? [{ ...firstPayment, amount: decimalText(netCash) }]
        : item.paymentBreakdown;

    // 重複する明細をまとめ、支払方法ごとの金額を計算する。
    const groups = new Map<string, ReceiptPaymentItem>();
    const collapsed: ReceiptPaymentItem[] = [];
    for (const payment of paymentBreakdown) {
        const amount = decimalUnits(payment.amount);
        if (amount == null || amount <= ZERO || payment.paymentType === "UNKNOWN")
            return {
                ...item,
                originalAmount: "",
                reviewStatus: "NEEDS_REVIEW",
                amountReason: "INVALID_PAYMENT_ALLOCATION",
            };
        if (!payment.duplicateGroup)
            collapsed.push(payment);
        else {
            const previous = groups.get(payment.duplicateGroup);
            if (!previous) {
                groups.set(payment.duplicateGroup, payment);
                collapsed.push(payment);
            } else if (previous.paymentType !== payment.paymentType || previous.amount !== payment.amount)
                return {
                    ...item,
                    originalAmount: "",
                    reviewStatus: "NEEDS_REVIEW",
                    amountReason: "PAYMENT_DUPLICATE_CONFLICT",
                };
        }
    }
    let points = ZERO;
    let nonCashPaid = ZERO;
    let cashPaid = ZERO;
    for (const payment of collapsed) {
        const amount = decimalUnits(payment.amount)!;
        if (payment.paymentType === "LOYALTY_POINTS")
            points += amount;
        else if (payment.paymentType === "CASH")
            cashPaid += amount;
        else if (PAID_TYPES.has(payment.paymentType))
            nonCashPaid += amount;
    }
    const hasCash = collapsed.some((payment) => payment.paymentType === "CASH");
    // 現金の預り額を重ねて計上せず、実際に支払った差額を使う。
    if (item.cashTendered?.trim()) {
        if (netCash === null)
            return {
                ...item,
                originalAmount: "",
                reviewStatus: "NEEDS_REVIEW",
                amountReason: "INVALID_CASH_FACTS",
            };
        if (hasCash && cashPaid !== tendered && cashPaid !== netCash)
            return {
                ...item,
                originalAmount: "",
                reviewStatus: "NEEDS_REVIEW",
                amountReason: "INVALID_CASH_FACTS",
            };
        cashPaid = netCash;
    } else if (!hasCash && item.change?.trim() && change !== ZERO) {
        return {
            ...item,
            originalAmount: "",
            reviewStatus: "NEEDS_REVIEW",
            amountReason: "INVALID_CASH_FACTS"
        };
    }
    // 実支払額とポイントの合計が購入総額と一致することを確認する。
    let paid = nonCashPaid + cashPaid;
    if (points + paid !== total) {
        const ungrouped = collapsed.filter((payment) => !payment.duplicateGroup
            && payment.paymentType !== "CASH" && PAID_TYPES.has(payment.paymentType));
        const unique = new Map(ungrouped.map((payment) => [
            `${payment.paymentType}:${payment.amount}`, decimalUnits(payment.amount)!,
        ]));
        const fixed = collapsed.filter((payment) => payment.paymentType !== "CASH" && payment.duplicateGroup)
            .filter((payment) => PAID_TYPES.has(payment.paymentType))
            .reduce((sum, payment) => sum + decimalUnits(payment.amount)!, cashPaid);
        const deduplicated = [...unique.values()].reduce((sum, amount) => sum + amount, fixed);
        if (unique.size < ungrouped.length && points + deduplicated === total)
            paid = deduplicated;
        else if (points > ZERO && points < total && cashPaid === ZERO && nonCashPaid === total) {
            paid = total - points;
        } else
            return {
                ...item,
                originalAmount: "",
                reviewStatus: "NEEDS_REVIEW",
                amountReason: "PAYMENT_TOTAL_MISMATCH"
            };
    }
    if (paid === ZERO && points === total)
        return {
            ...item,
            originalAmount: "0",
            reviewStatus: "EXCLUDED",
            amountReason: "FULL_LOYALTY_REDEMPTION",
        };

    return {
        ...item,
        paymentBreakdown,
        originalAmount: decimalText(paid),
        reviewStatus: "READY",
        amountPolicyVersion: "receipt-book-amount-v1",
        amountReason: "SETTLED_PAYMENT_EXCLUDING_LOYALTY_POINTS",
    };
}
