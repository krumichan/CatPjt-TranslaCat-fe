import type { ReceiptBlockingField } from "./receiptReview";
import type { ReceiptRowState } from "@/types/accountBookReceiptReview";

export function receiptFieldId(clientId: string, field: ReceiptBlockingField): string {
    return `receipt-${clientId}-${field}`;
}

export function receiptRowClassName(state: ReceiptRowState): string {
    switch (state) {
        case "PENDING":
            return "bg-amber-500/[0.08] dark:bg-amber-300/[0.09]";
        case "READY":
            return "bg-emerald-500/[0.07] dark:bg-emerald-300/[0.08]";
        default:
            return "bg-red-500/[0.07] dark:bg-red-400/[0.09]";
    }
}
