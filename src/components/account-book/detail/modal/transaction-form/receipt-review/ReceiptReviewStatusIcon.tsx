import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";
import type { ReceiptRowState } from "@/types/accountBookReceiptReview";

type Props = {
    state: ReceiptRowState;
};

export default function ReceiptReviewStatusIcon({ state }: Props) {
    if (state === "PENDING") {
        return (
            <LoaderCircle
                size={14}
                className="shrink-0 animate-spin text-amber-600 dark:text-amber-300"
            />
        );
    }
    if (state === "READY") {
        return (
            <CheckCircle2
                size={14}
                className="shrink-0 text-emerald-600 dark:text-emerald-300"
            />
        );
    }
    return (
        <AlertTriangle
            size={14}
            className="shrink-0 text-red-600 dark:text-red-300"
        />
    );
}
