export function formatYearMonth(
    year: number | null,
    month: number | null
) {
    if (!year || !month) {
        return "-";
    }

    return `${year}.${String(month).padStart(2, "0")}`;
}