"use client";

import { useMemo, useState } from "react";
import { ClipboardList, LockKeyhole } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import useSWR, { SWRConfig } from "swr";

import SectionHeader from "@/components/common/SectionHeader";
import { Link, useRouter } from "@/navigation";
import { boardError, boardService, type BoardApi } from "@/services/board/boardService";
import type { Board, BoardLocale } from "@/types/board";
import { BoardComposer } from "./BoardForms";
import { BoardThread } from "./BoardThread";
import { boardErrorStyle, boardPrimaryButton, boardSecondaryButton } from "./boardStyles";

const BOARD_IDS = ["MEMBER", "ANONYMOUS", "ADMIN"] as const;
const POST_ID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export function BoardSmartPage() {
    const { data: session, status } = useSession();
    const t = useTranslations("Board");
    const locale = useLocale();
    const params = useSearchParams();
    const isAdmin = session?.user.role === "ADMIN";
    const requested = params.get("board");
    const board = BOARD_IDS.find((item) => item === requested && (item !== "ADMIN" || isAdmin)) ?? "MEMBER";
    const rawPost = params.get("post");
    const post = rawPost && POST_ID.test(rawPost) ? rawPost : null;
    const login = session?.loginSessionId;
    const language: BoardLocale = locale === "learning" ? "ko" : locale === "ja" || locale === "en" ? locale : "ko";

    return (
        <div className="mx-auto max-w-6xl space-y-6 px-4 pb-12 pt-28">
            <SectionHeader title={t("title")} icon={<ClipboardList className="h-6 w-6 text-violet-500" aria-hidden="true" />} />
            {status === "loading" ? (
                <p role="status">{t("loading")}</p>
            ) : status !== "authenticated" || !login ? (
                <p className="rounded-xl border border-slate-200 p-6 dark:border-white/10">{t("loginRequired")}</p>
            ) : (
                <>
                    <nav aria-label={t("title")} className="flex flex-wrap gap-2">
                        {BOARD_IDS.filter((item) => item !== "ADMIN" || isAdmin).map((item) => (
                            <Link key={item} href={boardPath(item)} aria-current={item === board ? "page" : undefined}
                                className={item === board ? boardPrimaryButton : boardSecondaryButton}>
                                {t(item)}
                            </Link>
                        ))}
                    </nav>
                    <SWRConfig
                        key={`${login}:${board}:${post ?? ""}:${language}`}
                        value={{ provider: () => new Map() }}
                    >
                        <BoardWorkspace board={board} post={post} language={language} login={login} />
                    </SWRConfig>
                </>
            )}
        </div>
    );
}

function BoardWorkspace({ board, post, language, login }: {
    board: Board;
    post: string | null;
    language: BoardLocale;
    login: string;
}) {
    const t = useTranslations("Board");
    const router = useRouter();
    const api = useMemo(() => boardService(board, login), [board, login]);

    return (
        <section aria-label={t(board)}
            className="min-w-0 space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-white/10 dark:bg-slate-900">
            {post ? (
                <>
                    <Link href={boardPath(board)} className={boardSecondaryButton}>{t("back")}</Link>
                    <BoardThread board={board} post={post} locale={language} login={login} api={api}
                        onDeleted={() => router.push(boardPath(board))} />
                </>
            ) : (
                <BoardList board={board} locale={language} login={login} api={api} />
            )}
        </section>
    );
}

function BoardList({ board, locale, login, api }: {
    board: Board;
    locale: BoardLocale;
    login: string;
    api: BoardApi;
}) {
    const t = useTranslations("Board");
    const router = useRouter();
    const [page, setPage] = useState(0);
    const [composing, setComposing] = useState(false);
    const [originals, setOriginals] = useState(false);

    // 세션·언어·게시판이 바뀌면 이전 목록을 재사용하지 않는다.
    const { data, isLoading, error, mutate } = useSWR(
        ["board-list", login, board, locale, page],
        () => api.list(locale, page),
        {
            refreshInterval: (current) => current?.items.some((entry) => entry.translating) ? 2500 : 0,
            shouldRetryOnError: false,
        },
    );

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold">{t(board)}</h2>
                <div className="flex flex-wrap gap-2">
                    <button type="button" className={boardSecondaryButton} onClick={() => setOriginals((value) => !value)}>
                        {t(originals ? "showTranslation" : "showOriginal")}
                    </button>
                    <button type="button" className={boardPrimaryButton} onClick={() => setComposing(true)}>
                        {t("newPost")}
                    </button>
                </div>
            </div>
            {composing && (
                <BoardComposer board={board} api={api} post close={() => setComposing(false)}
                    save={async (draft) => {
                        const created = await api.createPost(draft);
                        void mutate();
                        router.push(boardPath(board, created.id));
                    }} />
            )}
            {error ? (
                <p role="alert" className={boardErrorStyle}>{t(boardError(error))}</p>
            ) : isLoading ? (
                <p role="status">{t("loading")}</p>
            ) : data?.items.length ? (
                <ul className="divide-y divide-slate-100 dark:divide-white/10">
                    {data.items.map((entry) => (
                        <li key={entry.id}>
                            <Link href={boardPath(board, entry.id)}
                                className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-3 hover:bg-slate-50 dark:hover:bg-white/5">
                                {entry.locked && <LockKeyhole className="h-4 w-4 shrink-0" aria-hidden="true" />}
                                <span className="min-w-0 flex-1 break-words font-medium">
                                    {entry.locked ? t("secretPost") : (!originals && entry.translatedTitle) || entry.title}
                                </span>
                                {!entry.locked && <span className="text-sm text-slate-500">{entry.author ?? t("anonymousAuthor")}</span>}
                                <time dateTime={entry.createdAt} className="text-sm text-slate-500">
                                    {new Date(entry.createdAt).toLocaleDateString(locale)}
                                </time>
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="py-10 text-center text-sm text-slate-500">{t("empty")}</p>
            )}
            <div className="flex justify-between">
                <button type="button" disabled={!page} className={boardSecondaryButton}
                    onClick={() => setPage((value) => value - 1)}>{t("previous")}</button>
                <button type="button" disabled={!data?.hasMore} className={boardSecondaryButton}
                    onClick={() => setPage((value) => value + 1)}>{t("next")}</button>
            </div>
        </>
    );
}

function boardPath(board: Board, post?: string) {
    return `/boards?board=${board}${post ? `&post=${post}` : ""}`;
}
