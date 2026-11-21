"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import useSWR from "swr";

import { boardPath } from "@/components/board/boardNavigation";
import SettingsSubPageHeader from "@/components/settings/SettingsSubPageHeader";
import { Link } from "@/navigation";
import { boardDirectory, boardError } from "@/services/board/boardService";
import { BOARD_TOPIC_TYPES, type BoardTopicType } from "@/types/board";
import { BoardForumEditor } from "./BoardForumEditor";

const PANEL = "space-y-4 rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900/80";
const TOPIC_LINK = "inline-flex min-h-9 items-center rounded-lg bg-slate-100 px-3 py-1 text-sm hover:text-violet-700 dark:bg-white/10 dark:hover:text-violet-200";

/** 관리자 설정에서 일반·익명 카테고리를 추가하고 현재 목록을 확인한다. */
export default function AdminBoardSettingsPage() {
    // 현재 관리자 세션이 확인되기 전에는 카테고리 조회나 등록을 시작하지 않는다.
    const t = useTranslations("Settings");
    const b = useTranslations("Board");
    const { data: session, status } = useSession();
    const login = session?.loginSessionId;
    const isAdmin = status === "authenticated" && session?.user?.role === "ADMIN" && Boolean(login);
    const directory = useMemo(() => boardDirectory(login ?? ""), [login]);
    const { data: forums, error, mutate } = useSWR(
        isAdmin ? ["board-directory", login] : null,
        directory.list,
        { shouldRetryOnError: false },
    );

    // 서버에서 성공한 카테고리를 현재 목록에 추가한 다음 서버 목록과 동기화한다.
    async function create(name: string, type: BoardTopicType) {
        const created = await directory.create(name, type);
        await mutate((current) => [
            ...(current ?? []).filter(({ id }) => id !== created.id),
            created,
        ], { revalidate: false });
        void mutate();
        return created;
    }

    const legacyAdmin = forums?.filter((forum) => forum.type === "ADMIN" && forum.id !== "ADMIN");
    const groups = { MEMBER: b("groups.MEMBER"), ANONYMOUS: b("groups.ANONYMOUS") };

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-24 pb-10 sm:px-6 lg:px-8">
            <SettingsSubPageHeader
                eyebrow={t("badges.admin")}
                title={t("boards.title")}
                description={t("boards.description")}
            />
            {status === "loading" ? (
                <p role="status">{b("loading")}</p>
            ) : !isAdmin ? (
                <p role="alert">{b("accessError")}</p>
            ) : error ? (
                <p role="alert">{b(boardError(error))}</p>
            ) : !forums ? (
                <p role="status">{b("loading")}</p>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {BOARD_TOPIC_TYPES.map((type) => {
                        const headingId = "board-settings-" + type;
                        const categories = forums.filter((forum) => forum.type === type && forum.name !== null);
                        return (
                            <section key={type} aria-labelledby={headingId} className={PANEL}>
                                <h2 id={headingId} className="text-lg font-semibold">
                                    {b("categoriesFor", { group: groups[type] })}
                                </h2>
                                {categories.length > 0 && (
                                    <ul className="flex flex-wrap gap-2">
                                        {categories.map((forum) => (
                                            <li key={forum.id}>
                                                <Link href={boardPath(forum.id)} className={TOPIC_LINK}>{forum.name}</Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <BoardForumEditor create={(name) => create(name, type)} />
                            </section>
                        );
                    })}
                    {legacyAdmin && legacyAdmin.length > 0 && (
                        <section aria-labelledby="legacy-admin-boards" className={PANEL + " md:col-span-2"}>
                            <h2 id="legacy-admin-boards" className="text-lg font-semibold">{b("legacyAdminForums")}</h2>
                            <ul className="flex flex-wrap gap-2">
                                {legacyAdmin.map((forum) => (
                                    <li key={forum.id}>
                                        <Link href={boardPath(forum.id)} className={TOPIC_LINK}>{forum.name}</Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
