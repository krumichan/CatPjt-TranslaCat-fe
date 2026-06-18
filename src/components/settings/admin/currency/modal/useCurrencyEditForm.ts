import { SyntheticEvent, useState } from "react";

import { AdminCurrency, CurrencyUpdateRequest } from "@/types/currency";

type UseCurrencyEditFormProps = {
    currency: AdminCurrency;
    isUpdating: boolean;
    onSubmit: (request: CurrencyUpdateRequest) => void;
};

export function useCurrencyEditForm({
    currency,
    isUpdating,
    onSubmit,
}: UseCurrencyEditFormProps) {
    const [name, setName] = useState(currency.name);
    const [symbol, setSymbol] = useState(currency.symbol ?? "");
    const [decimalPlaces, setDecimalPlaces] = useState(
        String(currency.decimalPlaces),
    );

    const canSubmit = !!name.trim() && !isUpdating;

    const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        onSubmit({
            name: name.trim(),
            symbol: symbol.trim() || null,
            decimalPlaces: Number(decimalPlaces || 0),
        });
    };

    return {
        name,
        setName,
        symbol,
        setSymbol,
        decimalPlaces,
        setDecimalPlaces,
        canSubmit,
        handleSubmit,
    };
}