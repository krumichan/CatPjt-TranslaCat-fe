import type {
    AccountBookCategory,
    AccountBookFixedCost,
    AccountBookFixedCostRequest,
    AccountBookStoreSuggestion,
    CurrencyCode,
} from "@/types/accountBook";

export type FixedCostFormModalProps = {
    isOpen: boolean;
    fixedCost?: AccountBookFixedCost | null;
    currencyCode: CurrencyCode;
    categoryOptions: AccountBookCategory[];
    storeOptions: AccountBookStoreSuggestion[];
    onClose: () => void;
    onSubmit: (values: AccountBookFixedCostRequest) => void | Promise<void>;
};
