"use client";

import { ChevronRight, ClipboardList, MessagesSquare, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Link } from "@/navigation";
import { BOARD_TOPIC_TYPES, type BoardForum, type BoardTopicType } from "@/types/board";
import { boardGroupPath, boardPath } from "./boardNavigation";

const GROUP_ICONS = { MEMBER: ClipboardList, ANONYMOUS: MessagesSquare };

/** 일반·익명 카테고리로 이동하거나 관리자 게시판을 바로 연다. */
export function BoardDirectory({ forums, group }: {
    forums: BoardForum[];
    group: BoardTopicType;
}) {
    const t = useTranslations("Board");
    const label = { MEMBER: t("groups.MEMBER"), ANONYMOUS: t("groups.ANONYMOUS") };

    // 서버가 현재 관리자 세션에 반환한 기본 게시판만 최상단에 표시한다.
    const showAdmin = forums.some((forum) => forum.id === "ADMIN" && forum.type === "ADMIN");
    const categories = forums.filter((forum) => forum.type === group);

    return (
        <div className="space-y-4">
            <nav aria-label={t("boardGroups")} className={cn(
                "grid gap-2",
                showAdmin ? "grid-cols-3" : "grid-cols-2",
            )}>
                {BOARD_TOPIC_TYPES.map((type) => {
                    const Icon = GROUP_ICONS[type];
                    return (
                        <Link
                            key={type}
                            href={boardGroupPath(type)}
                            aria-current={type === group ? "page" : undefined}
                            className={cn(
                                "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold",
                                "border-slate-200 bg-white text-slate-600 hover:border-violet-400 hover:text-violet-700",
                                "aria-[current=page]:border-violet-500 aria-[current=page]:bg-violet-50",
                                "aria-[current=page]:text-violet-800 dark:border-white/10 dark:bg-slate-900",
                                "dark:text-slate-300 dark:aria-[current=page]:border-violet-400",
                                "dark:aria-[current=page]:bg-violet-400/10 dark:aria-[current=page]:text-violet-200",
                            )}
                        >
                            <Icon className="size-4 shrink-0" aria-hidden="true" />
                            {label[type]}
                        </Link>
                    );
                })}
                {showAdmin && (
                    <Link
                        href={boardPath("ADMIN")}
                        className={cn(
                            "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold",
                            "border-slate-200 bg-white text-slate-600 hover:border-violet-400 hover:text-violet-700",
                            "dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-violet-200",
                        )}
                    >
                        <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
                        {t("groups.ADMIN")}
                    </Link>
                )}
            </nav>
            <section aria-labelledby="board-categories-heading">
                <h2 id="board-categories-heading" className="sr-only">
                    {t("categoriesFor", { group: label[group] })}
                </h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                    {categories.map((forum) => (
                        <li key={forum.id} className="min-w-0">
                            <Link
                                href={boardPath(forum.id)}
                                className={cn(
                                    "group flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3",
                                    "border-slate-200 bg-white font-medium text-slate-800 hover:border-violet-400",
                                    "dark:border-white/10 dark:bg-slate-900 dark:text-slate-100",
                                )}
                            >
                                <span className="min-w-0 wrap-anywhere">
                                    {forum.name ?? (forum.type === "MEMBER" ? t("generalForum") : t(forum.type))}
                                </span>
                                <ChevronRight className="size-4 shrink-0 text-slate-400 group-hover:text-violet-500" aria-hidden="true" />
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
