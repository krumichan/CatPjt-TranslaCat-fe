"use client";

import { useTranslations } from "next-intl";

import { SignalList } from "@/components/language-learning/common/SignalList";
import { DashboardWidgetCard } from "@/components/language-learning/dashboard/widgets/DashboardWidgetCard";
import type { ProfileSignal } from "@/types/language-learning/profile";

interface DashboardWeaknessWidgetProps {
    grammarWeaknesses: ProfileSignal[];
    errorPatterns: ProfileSignal[];
}

export function DashboardWeaknessWidget({
    grammarWeaknesses,
    errorPatterns,
}: DashboardWeaknessWidgetProps) {
    const t = useTranslations("LanguageLearning.dashboard.widgets.weakness");

    return (
        <DashboardWidgetCard title={t("title")}>
            <div className="space-y-5">
                <div>
                    <h3 className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        {t("grammar")}
                    </h3>
                    <SignalList items={grammarWeaknesses} emptyText={t("emptyGrammar")} />
                </div>
                <div>
                    <h3 className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        {t("patterns")}
                    </h3>
                    <SignalList items={errorPatterns} emptyText={t("emptyPattern")} />
                </div>
            </div>
        </DashboardWidgetCard>
    );
}
