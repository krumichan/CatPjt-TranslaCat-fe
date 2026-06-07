export function onlyDigits(value: string) {
    return value.replace(/\D/g, "");
}

export function formatNumberWithCommas(value: string) {
    if (!value) {
        return "";
    }

    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}