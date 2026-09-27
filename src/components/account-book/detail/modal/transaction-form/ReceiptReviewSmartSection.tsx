"use client";

import { useReceiptReviewListController } from "@/hooks/account-book/detail/receipt/useReceiptReviewListController";
import ReceiptReviewList from "./ReceiptReviewList";
import type { ReceiptReviewListProps } from "./receipt-review/types";

export default function ReceiptReviewSmartSection(props: ReceiptReviewListProps) {
    const controller = useReceiptReviewListController({
        review: props.review,
        categoryNames: props.categoryNames,
    });

    return (
        <ReceiptReviewList
            {...props}
            controller={controller}
        />
    );
}
