import {AdminCurrency} from "@/types/currency";

export const initialCurrencies: AdminCurrency[] = [
    {
        id: 1,
        code: "JPY",
        name: "Japanese Yen",
        symbol: "¥",
        decimalPlaces: 0,
        baseCurrency: true,
        enabled: true,
    },
    {
        id: 2,
        code: "KRW",
        name: "Korean Won",
        symbol: "₩",
        decimalPlaces: 0,
        baseCurrency: false,
        enabled: true,
    },
];