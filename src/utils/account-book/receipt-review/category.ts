import type { ReceiptCategorySource, ReceiptCategoryOption } from "@/types/accountBook";
import type { ReceiptReviewItem } from "./types";

export const RECEIPT_DIRECT_CATEGORY = "__DIRECT_INPUT__";

export const CATEGORY_SOURCE_PRIORITY: Record<ReceiptCategorySource, number> = {
    EXISTING: 0,
    DEFAULT: 1,
    NEW: 2,
    FALLBACK: 3,
    USER: 4,
};

export function buildReceiptCategoryOptions(
    existingNames: string[],
    suggested: ReceiptCategoryOption[] = [],
    items: ReceiptReviewItem[] = []
): ReceiptCategoryOption[] {
    const options = new Map<string, ReceiptCategoryOption>();

    const add = (name: string, source: ReceiptCategorySource) => {
        const clean = name.trim();
        if (!clean || clean.length > 50 || /[\u0000-\u001f\u007f]/.test(clean))
            return;
        const key = clean.toLocaleLowerCase();
        const previous = options.get(key);
        if (!previous || CATEGORY_SOURCE_PRIORITY[source] < CATEGORY_SOURCE_PRIORITY[previous.source])
            options.set(key, { name: clean, source });
    };

    existingNames.forEach((name) => add(name, "EXISTING"));
    suggested.forEach((option) => add(option.name, option.source));
    items.forEach((item) => add(item.categoryName, item.categorySource));
    return [...options.values()];
}

export function editReceiptCategorySelection(item: ReceiptReviewItem, value: string, source: ReceiptCategorySource = "USER"): ReceiptReviewItem {
    if (value === RECEIPT_DIRECT_CATEGORY) {
        return {
            ...item,
            categorySelection: value,
            categoryName: item.directCategoryName,
            reviewedRevision: null
        };
    }

    return {
        ...item,
        categorySelection: value,
        categoryName: value,
        directCategoryName: "",
        categorySource: source,
        categoryReason: source === "USER" ? "USER_EDITED" : item.categoryReason,
        reviewedRevision: null,
    };
}

export function editReceiptDirectCategory(item: ReceiptReviewItem, value: string): ReceiptReviewItem {
    return {
        ...item,
        categorySelection: RECEIPT_DIRECT_CATEGORY,
        directCategoryName: value,
        categoryName: value,
        categorySource: "USER",
        categoryReason: "USER_EDITED",
        reviewedRevision: null,
    };
}
