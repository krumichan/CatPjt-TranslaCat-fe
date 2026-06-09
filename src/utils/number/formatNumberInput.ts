export function onlyDigits(value: string) {
    return value.replace(/\D/g, "");
}

export function formatNumberWithComma(value: string | number | null | undefined) {
    if (value === null || value === undefined) {
        return "";
    }

    const onlyNumbers = String(value).replace(/\D/g, "");

    if (!onlyNumbers) {
        return "";
    }

    return Number(onlyNumbers).toLocaleString();
}

export function parseCommaNumber(value: string) {
    return Number(value.replaceAll(",", ""));
}