
export function getDefaultYearMonth(selectedMonth: string, now: Date = new Date()) {
    if (selectedMonth === "ALL") {

        return {
            year: String(now.getFullYear()),
            month: String(now.getMonth() + 1).padStart(2, "0"),
        };
    }

    const [year, month] = selectedMonth.split("-");

    return {
        year,
        month,
    };
}
