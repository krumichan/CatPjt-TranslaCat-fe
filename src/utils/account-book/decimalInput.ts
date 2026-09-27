/** Group only the integer part; never turn 12.34 into 1234 or round a decimal. */
export function formatDecimalInput(value: string | number | null | undefined): string {
    if (value == null) return "";
    const raw = String(value).replaceAll(",", "");
    if (!/^\d*(?:\.\d*)?$/.test(raw)) return raw;
    const [integer, fraction] = raw.split(".");
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return fraction === undefined ? grouped : `${grouped || "0"}.${fraction}`;
}

export function isPositiveDecimal(value: string): boolean {
    return /^\d+(\.\d+)?$/.test(value.trim()) && /[1-9]/.test(value);
}

/** Input grouping is presentation only; retain all entered decimal digits. */
export function parsePositiveDecimalInput(value: string): string | null {
    const decimal = value.replaceAll(",", "").trim();
    return isPositiveDecimal(decimal) ? decimal : null;
}
