"use client";

import {
    AlertCircle,
    BookOpen,
    Loader2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import RubyText from "@/components/common/RubyText";
import { useLocalizedName } from "@/hooks/useLocalizedName";
import {
    type RecentView,
    recentViewService,
} from "@/services/recentViewService";
import { useRouter } from "@/navigation";
import { getRecentViewLink } from "@/utils/routerHelper";

const DISPLAY_LIMIT = 5;

export function AppSidebarRecentHistory() {
    const t = useTranslations("Navigation.recent");
    const { status } = useSession();
    const router = useRouter();
    const localizedName = useLocalizedName();

    const [recentViews, setRecentViews] = useState<
        RecentView[]
    >([]);
    const [state, setState] = useState<
        "loading" | "ready" | "error"
    >("loading");

    useEffect(() => {
        let isActive = true;

        if (status === "loading") {
            return () => {
                isActive = false;
            };
        }

        if (status !== "authenticated") {
            Promise.resolve().then(() => {
                if (!isActive) {
                    return;
                }

                setRecentViews([]);
                setState("ready");
            });

            return () => {
                isActive = false;
            };
        }

        recentViewService
            .getTop10()
            .then((items) => {
                if (!isActive) {
                    return;
                }

                setRecentViews(items.slice(0, DISPLAY_LIMIT));
                setState("ready");
            })
            .catch((error: unknown) => {
                console.error(
                    "Failed to load sidebar recent history:",
                    error,
                );

                if (!isActive) {
                    return;
                }

                setState("error");
            });

        return () => {
            isActive = false;
        };
    }, [status]);

    if (state === "loading") {
        return (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-400">
                <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                />
                {t("loading")}
            </div>
        );
    }

    if (state === "error") {
        return (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-3 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                />
                {t("error")}
            </div>
        );
    }

    if (recentViews.length === 0) {
        return (
            <p className="px-3 py-3 text-xs leading-5 text-slate-400">
                {t("empty")}
            </p>
        );
    }

    return (
        <ul className="space-y-1">
            {recentViews.map((item) => (
                <li key={item.id}>
                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                getRecentViewLink(item),
                            )
                        }
                        className="flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <BookOpen
                            className="mt-0.5 h-4 w-4 shrink-0 text-blue-500"
                            aria-hidden="true"
                        />
                        <RubyText
                            content={localizedName(item.title)}
                            className="line-clamp-2 text-xs font-semibold leading-5"
                        />
                    </button>
                </li>
            ))}
        </ul>
    );
}
