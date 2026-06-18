export type AdminCurrency = {
    id: number;
    code: string;
    name: string;
    symbol: string | null;
    decimalPlaces: number;
    baseCurrency: boolean;
    enabled: boolean;
};

export type CurrencyCreateRequest = {
    code: string;
    name: string;
    symbol?: string | null;
    decimalPlaces: number;
    baseCurrency: boolean;
};

export type CurrencyUpdateRequest = {
    name: string;
    symbol?: string | null;
    decimalPlaces: number;
};