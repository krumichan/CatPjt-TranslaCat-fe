// Account-book storage supports eight fractional digits. These helpers only
// aggregate displayed amounts; exchange-rate calculation remains on the server.
const SCALE = 8;

export function decimalToUnits(value: number | string): bigint {
    const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(String(value));
    if (!match) throw new Error("Invalid decimal amount.");
    const fraction = match[3] ?? "";
    const shift = SCALE - fraction.length + Number(match[4] ?? 0);
    if (!Number.isSafeInteger(shift) || Math.abs(shift) > 100) throw new Error("Invalid decimal scale.");
    const unsigned = BigInt(match[2] + fraction);
    if (shift < 0 && unsigned % (BigInt(10) ** BigInt(-shift)) !== BigInt(0)) throw new Error("Amount exceeds storage precision.");
    const units = shift >= 0 ? unsigned * BigInt(10) ** BigInt(shift) : unsigned / BigInt(10) ** BigInt(-shift);
    return match[1] ? -units : units;
}

export function unitsToDecimal(units: bigint): string {
    const negative = units < BigInt(0);
    const digits = (negative ? -units : units).toString().padStart(SCALE + 1, "0");
    const fraction = digits.slice(-SCALE).replace(/0+$/, "");
    return `${negative ? "-" : ""}${digits.slice(0, -SCALE)}${fraction ? `.${fraction}` : ""}`;
}

export function sumDecimalAmounts(amounts: (number | string)[]): string {
    return unitsToDecimal(amounts.reduce<bigint>((sum, amount) => sum + decimalToUnits(amount), BigInt(0)));
}
