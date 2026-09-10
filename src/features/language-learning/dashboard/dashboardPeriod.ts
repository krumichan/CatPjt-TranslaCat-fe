import type { DashboardPeriod } from "@/types/language-learning/dashboard";

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function resolvePeriod(period: DashboardPeriod, now: Date = new Date()) {
    const to = new Date(now);
    const from = new Date(to);
    from.setDate(to.getDate() - (period === "7d" ? 6 : 29));
    return { from: formatLocalDate(from), to: formatLocalDate(to) };
}
