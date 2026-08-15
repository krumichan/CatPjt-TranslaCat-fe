"use client";

import { useTranslations } from "next-intl";
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { DashboardWidgetCard } from "@/components/language-learning/dashboard/widgets/DashboardWidgetCard";
import type { ScorePoint } from "@/types/language-learning/dashboard";

export function DashboardTrendWidget({ data }: { data: ScorePoint[] }) {
    const t = useTranslations("LanguageLearning.dashboard.widgets.trend");

    return (
        <DashboardWidgetCard title={t("title")} description={t("description")}>
            {data.length === 0 ? (
                <p className="py-16 text-center text-sm text-slate-400">
                    {t("empty")}
                </p>
            ) : (
                <div className="h-[280px] w-full" role="img" aria-label={t("ariaLabel")}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ left: -15, right: 8, top: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={24} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="overall" name={t("overall")} stroke="currentColor" className="text-blue-600" strokeWidth={2.5} dot={false} />
                            <Line type="monotone" dataKey="grammar" name={t("grammar")} stroke="currentColor" className="text-emerald-600" strokeWidth={1.5} dot={false} />
                            <Line type="monotone" dataKey="naturalness" name={t("naturalness")} stroke="currentColor" className="text-violet-600" strokeWidth={1.5} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </DashboardWidgetCard>
    );
}
