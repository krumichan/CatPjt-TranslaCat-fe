import type { ReceiptPaymentItem } from "@/types/accountBook";

const PAYMENT_TYPES = new Set([
    "LOYALTY_POINTS", "CASH", "CREDIT_CARD", "DEBIT_CARD", "ELECTRONIC_MONEY",
    "GIFT_CARD", "VOUCHER", "OTHER_PAID", "UNKNOWN",
]);

export function parseReceiptPaymentBreakdown(value?: string | null): ReceiptPaymentItem[] {
    if (!value) return [];
    try {
        const parsed: unknown = JSON.parse(value);
        if (!Array.isArray(parsed)) return [];
        return parsed.flatMap((item): ReceiptPaymentItem[] => {
            if (!item || typeof item !== "object") return [];
            const row = item as Record<string, unknown>;
            if (typeof row.paymentType !== "string" || !PAYMENT_TYPES.has(row.paymentType)
                || typeof row.amount !== "string") return [];
            return [{
                paymentType: row.paymentType as ReceiptPaymentItem["paymentType"],
                amount: row.amount,
                evidence: typeof row.evidence === "string" ? row.evidence : null,
                duplicateGroup: typeof row.duplicateGroup === "string" ? row.duplicateGroup : null,
            }];
        });
    } catch {
        return [];
    }
}
