export type YearMonth = {
    year: number;
    month: number;
};

export function getCurrentMonthValue() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
}

export function parseSelectedMonthValue(selectedMonth: string): YearMonth | null {
    if (selectedMonth === "ALL") {
        return null;
    }

    const [year, month] = selectedMonth.split("-").map(Number);

    if (!Number.isFinite(year) || !Number.isFinite(month)) {
        return null;
    }

    return {
        year,
        month,
    };
}
