import type {
    AccountBookCategory,
    AccountBookFixedCost,
    AccountBookStoreSuggestion,
} from "@/types/accountBook";

export const DIRECT_INPUT_VALUE = "__DIRECT_INPUT__";

export const STORE_NONE_VALUE = "__NONE__";

function getCurrentYearMonth(now: Date = new Date()) {

    return {
        year: String(now.getFullYear()),
        month: String(now.getMonth() + 1),
    };
}

export function isValidYearMonth(year: string, month: string) {
    return (
        Number(year) >= 2000 &&
        Number(year) <= 9999 &&
        Number(month) >= 1 &&
        Number(month) <= 12
    );
}

export function isEndMonthBeforeStartMonth(
    startYear: string,
    startMonth: string,
    endYear: string,
    endMonth: string
) {
    if (
        !isValidYearMonth(startYear, startMonth) ||
        !isValidYearMonth(endYear, endMonth)
    ) {
        return false;
    }

    const startValue = Number(startYear) * 100 + Number(startMonth);
    const endValue = Number(endYear) * 100 + Number(endMonth);

    return endValue < startValue;
}

export function getInitialValues(
    fixedCost: AccountBookFixedCost | null | undefined,
    categoryOptions: AccountBookCategory[],
    storeOptions: AccountBookStoreSuggestion[],
    now: Date = new Date(),
) {
    const currentYearMonth = getCurrentYearMonth(now);

    if (!fixedCost) {
        return {
            title: "",
            storeName: STORE_NONE_VALUE,
            directStoreName: "",
            category: "",
            directCategory: "",
            amount: "",
            paymentDay: "1",
            startYear: currentYearMonth.year,
            startMonth: currentYearMonth.month,
            endYear: "",
            endMonth: "",
            memo: "",
        };
    }

    const hasStore =
        !!fixedCost.storeName &&
        storeOptions.some((store) => store.storeName === fixedCost.storeName);

    const hasCategory = categoryOptions.some(
        (category) => category.name === fixedCost.category
    );

    return {
        title: fixedCost.title,
        storeName: !fixedCost.storeName
            ? STORE_NONE_VALUE
            : hasStore
                ? fixedCost.storeName
                : DIRECT_INPUT_VALUE,
        directStoreName:
            fixedCost.storeName && !hasStore ? fixedCost.storeName : "",
        category: hasCategory ? fixedCost.category : DIRECT_INPUT_VALUE,
        directCategory: hasCategory ? "" : fixedCost.category,
        amount: String(fixedCost.amount),
        paymentDay: String(fixedCost.paymentDay),
        startYear: String(fixedCost.startYear),
        startMonth: String(fixedCost.startMonth),
        endYear: fixedCost.endYear ? String(fixedCost.endYear) : "",
        endMonth: fixedCost.endMonth ? String(fixedCost.endMonth) : "",
        memo: fixedCost.memo ?? "",
    };
}
