"use client";

import {
    ArrowUpRight,
    Cat,
    Github,
    Mail,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { AppNavigationTooltip } from "@/components/navigation/app/AppNavigationTooltip";

interface AppDeveloperContactProps {
    isCollapsed?: boolean;
}

const DEVELOPER_NAME = "krumichan";
const DEVELOPER_GITHUB_URL = "https://github.com/krumichan";
const DEVELOPER_EMAIL = "bellline0403@gmail.com";

export function AppDeveloperContact({
    isCollapsed = false,
}: AppDeveloperContactProps) {
    const t = useTranslations("Navigation.developer");
    const emailLabel = `${t("email")}: ${DEVELOPER_EMAIL}`;
    const linkClassName = `group relative flex min-h-11 items-center rounded-xl text-xs text-slate-600 transition hover:bg-slate-100 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-blue-400 ${
        isCollapsed
            ? "justify-center px-2"
            : "gap-2 px-2"
    }`;

    return (
        <section
            aria-label={t("title")}
            data-testid="app-developer-contact"
            className={`shrink-0 border-t border-slate-200 pt-3 dark:border-white/10 ${
                isCollapsed ? "mx-2" : "mx-3"
            }`}
        >
            {!isCollapsed && (
                <div className="mb-1 px-2">
                    <p className="mb-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {t("title")}
                    </p>
                    <p className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                            <Cat className="h-4 w-4" aria-hidden="true" />
                        </span>
                        {DEVELOPER_NAME}
                    </p>
                </div>
            )}

            {/* 외부 프로필과 메일 작성은 앱 내부 라우팅을 거치지 않습니다. */}
            <a
                href={DEVELOPER_GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("github")}
                className={linkClassName}
            >
                <Github className="h-4 w-4 shrink-0" aria-hidden="true" />
                {isCollapsed ? (
                    <AppNavigationTooltip>{t("github")}</AppNavigationTooltip>
                ) : (
                    <>
                        <span>{t("github")}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    </>
                )}
            </a>
            <a
                href={`mailto:${DEVELOPER_EMAIL}`}
                aria-label={emailLabel}
                className={linkClassName}
            >
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                {isCollapsed ? (
                    <AppNavigationTooltip>{emailLabel}</AppNavigationTooltip>
                ) : (
                    <span className="min-w-0 break-all">{DEVELOPER_EMAIL}</span>
                )}
            </a>
        </section>
    );
}
