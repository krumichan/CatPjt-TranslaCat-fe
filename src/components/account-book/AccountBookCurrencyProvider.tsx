"use client";

import { createContext, useContext, type ReactNode } from "react";
import { formatAmount } from "@/utils/account-book/formatAmount";

type CurrencyPrecision = { currencyCode: string; decimalPlaces?: number };
const CurrencyContext = createContext<CurrencyPrecision | null>(null);

export function AccountBookCurrencyProvider({
    currencyCode, decimalPlaces, children,
}: CurrencyPrecision & { children: ReactNode }) {
    return (
        <CurrencyContext value={{ currencyCode, decimalPlaces }}>
            {children}
        </CurrencyContext>
    );
}

export function useAmountFormatter() {
    const currency = useContext(CurrencyContext);
    return (amount: number | string | null | undefined, currencyCode: string) =>
        formatAmount(amount, currencyCode,
            currency?.currencyCode === currencyCode ? currency.decimalPlaces : undefined);
}
