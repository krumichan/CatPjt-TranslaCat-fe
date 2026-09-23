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

export function recalculateAmountFacts(item: ReceiptReviewItem): ReceiptReviewItem {
    const total = decimalUnits(item.purchaseTotal);
    if (total == null || total <= ZERO)
        return {
            ...item,
            originalAmount: "",
            reviewStatus: "NEEDS_REVIEW",
            amountReason: "MISSING_OR_INVALID_PURCHASE_TOTAL",
        };
    if (!item.paymentBreakdown.length)
        return {
            ...item,
            originalAmount: decimalText(total),
            reviewStatus: "READY",
            amountPolicyVersion: "receipt-book-amount-v1",
            amountReason: "PURCHASE_TOTAL_NO_PAYMENT_ALLOCATION",
        };
    const groups = new Map<string, ReceiptPaymentItem>();
    const collapsed: ReceiptPaymentItem[] = [];
    for (const payment of item.paymentBreakdown) {
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
    if (item.cashTendered) {
        const tendered = decimalUnits(item.cashTendered);
        const change = decimalUnits(item.change);
        if (tendered == null || change == null || tendered < change)
            return {
                ...item,
                originalAmount: "",
                reviewStatus: "NEEDS_REVIEW",
                amountReason: "INVALID_CASH_FACTS",
            };
        const netCash = tendered - change;
        if (hasCash && cashPaid !== tendered && cashPaid !== netCash)
            return {
                ...item,
                originalAmount: "",
                reviewStatus: "NEEDS_REVIEW",
                amountReason: "INVALID_CASH_FACTS",
            };
        cashPaid = netCash;
    } else if (!hasCash && item.change && decimalUnits(item.change) !== ZERO) {
        return {
            ...item,
            originalAmount: "",
            reviewStatus: "NEEDS_REVIEW",
            amountReason: "INVALID_CASH_FACTS"
        };
    }
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
        originalAmount: decimalText(paid),
        reviewStatus: "READY",
        amountPolicyVersion: "receipt-book-amount-v1",
        amountReason: "SETTLED_PAYMENT_EXCLUDING_LOYALTY_POINTS",
    };
}
