"use client";

import { useMemo, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Languages,
    LockKeyhole,
    PencilLine,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import useSWR, { SWRConfig } from "swr";

import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { Link, useRouter } from "@/navigation";
import { boardError, boardService, type BoardApi } from "@/services/board/boardService";
import type { Board, BoardLocale } from "@/types/board";
import { BoardComposer } from "./BoardForms";
import { BoardThread } from "./BoardThread";
import { boardErrorStyle, boardPrimaryButton, boardSecondaryButton } from "./boardStyles";

const BOARD_IDS = ["MEMBER", "ANONYMOUS", "ADMIN"] as const;
const POST_ID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const BOARD_ROW_LAYOUT = cn(
    "grid items-center gap-x-4 px-4 sm:px-5",
    "sm:grid-cols-[minmax(0,1fr)_minmax(6rem,0.28fr)_8rem_1rem]",
);
const BOARD_SURFACE = "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900";

/** 로그인 세션에 허용된 게시판으로 URL을 해석하고 게시판별 작업 화면을 표시한다. */
export function BoardSmartPage() {
    // URL에서 선택한 게시판과 게시글을 읽고 관리자 탭은 관리자 세션에만 연다.
    const { data: session, status } = useSession();
    const t = useTranslations("Board");
    const locale = useLocale();
    const params = useSearchParams();
    const login = session?.loginSessionId;
    const isAdmin = session?.user?.role === "ADMIN";
    const availableBoards = BOARD_IDS.filter((item) => item !== "ADMIN" || isAdmin);
    const board = availableBoards.find((item) => item === params.get("board")) ?? "MEMBER";
    const rawPost = params.get("post");
    const post = rawPost && POST_ID.test(rawPost) ? rawPost : null;

    // 학습 모드의 게시글 번역 언어는 기존과 같이 한국어를 사용한다.
    const language: BoardLocale = locale === "ja" || locale === "en" ? locale : "ko";

    return (
        <div className="mx-auto max-w-6xl space-y-5 px-4 pb-12 pt-28 sm:px-6">
            <header className={cn(BOARD_SURFACE, "px-4 pt-4 sm:px-6 sm:pt-5")}>
                <h1 className="mb-3 flex items-center gap-3 text-2xl font-bold tracking-tight sm:mb-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300">
                        <ClipboardList className="size-5" aria-hidden="true" />
                    </span>
                    {t("title")}
                </h1>
                {status === "authenticated" && login && (
                    <nav aria-label={t("title")} className="flex flex-wrap gap-x-1 border-t border-slate-100 dark:border-white/10">
                        {availableBoards.map((item) => (
                            <Link
                                key={item}
                                href={boardPath(item)}
                                aria-current={item === board ? "page" : undefined}
                                className={cn(
                                    "inline-flex min-h-12 items-center border-b-2 px-2.5 text-sm font-semibold sm:px-4",
                                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet-500",
                                    item === board
                                        ? "border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300"
                                        : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
                                )}
                            >
                                {t(item)}
                            </Link>
                        ))}
                    </nav>
                )}
            </header>
            {status === "loading" ? (
                <p role="status">{t("loading")}</p>
            ) : status !== "authenticated" || !login ? (
                <p className="rounded-xl border border-slate-200 p-6 dark:border-white/10">{t("loginRequired")}</p>
            ) : (
                // 게시판·상세 글·언어·세션 경계를 기준으로 목록과 열람 상태를 분리한다.
                <SWRConfig
                    key={`${login}:${board}:${post ?? ""}:${language}`}
                    value={{ provider: () => new Map() }}
                >
                    <BoardWorkspace board={board} post={post} language={language} login={login} />
                </SWRConfig>
            )}
        </div>
    );
}

// 같은 게시판의 목록과 글 상세가 세션으로 범위가 지정된 API를 공유한다.
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
        <section
            aria-label={t(board)}
            className={cn(BOARD_SURFACE, "min-w-0", post && "space-y-5 p-4 sm:p-6")}
        >
            {post ? (
                <>
                    <Link href={boardPath(board)} className={boardSecondaryButton}>
                        <ChevronLeft className="size-4" aria-hidden="true" />
                        {t("back")}
                    </Link>
                    <BoardThread
                        board={board}
                        post={post}
                        locale={language}
                        login={login}
                        api={api}
                        onDeleted={() => router.push(boardPath(board))}
                    />
                </>
            ) : (
                <BoardList board={board} locale={language} login={login} api={api} />
            )}
        </section>
    );
}

// 현재 게시판의 글 목록을 표시하고 목록에서 새 글을 작성한다.
function BoardList({ board, locale, login, api }: {
    board: Board;
    locale: BoardLocale;
    login: string;
    api: BoardApi;
}) {
    // 페이지 이동과 원문 표시 여부는 현재 목록 화면에만 적용한다.
    const t = useTranslations("Board");
    const router = useRouter();
    const [page, setPage] = useState(0);
    const [composing, setComposing] = useState(false);
    const [originals, setOriginals] = useState(false);

    // 요청 범위별로 목록을 나누고 번역 대기 중인 항목이 있을 때 목록을 갱신한다.
    const { data, isLoading, error, mutate } = useSWR(
        ["board-list", login, board, locale, page],
        () => api.list(locale, page),
        {
            refreshInterval: (current) => current?.items.some((entry) => entry.translating) ? 2500 : 0,
            shouldRetryOnError: false,
        },
    );
    const dateFormat = useMemo(() => new Intl.DateTimeFormat(locale), [locale]);

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                <h2 className="text-lg font-bold">{t("postList")}</h2>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        className={boardSecondaryButton}
                        onClick={() => setOriginals((value) => !value)}
                    >
                        <Languages className="size-4" aria-hidden="true" />
                        {t(originals ? "showTranslation" : "showOriginal")}
                    </button>
                    <button type="button" className={boardPrimaryButton} onClick={() => setComposing(true)}>
                        <PencilLine className="size-4" aria-hidden="true" />
                        {t("newPost")}
                    </button>
                </div>
            </div>
            {composing && (
                <div className="px-4 pb-4 sm:px-5">
                    <BoardComposer
                        board={board}
                        api={api}
                        post
                        close={() => setComposing(false)}
                        save={async (draft) => {
                            // 저장에 성공하면 목록을 갱신하고 새 게시글로 이동한다.
                            const created = await api.createPost(draft);
                            void mutate();
                            router.push(boardPath(board, created.id));
                        }}
                    />
                </div>
            )}
            {error ? (
                <p role="alert" className={cn(boardErrorStyle, "m-4 sm:mx-5")}>{t(boardError(error))}</p>
            ) : isLoading ? (
                <p role="status" className="border-t border-slate-200 px-4 py-10 text-center text-sm dark:border-white/10">
                    {t("loading")}
                </p>
            ) : data?.items.length ? (
                <>
                    <div
                        aria-hidden="true"
                        className={cn(
                            BOARD_ROW_LAYOUT,
                            "hidden border-y border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-600",
                            "sm:grid dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
                        )}
                    >
                        <span>{t("postTitle")}</span>
                        <span>{t("author")}</span>
                        <span className="text-right">{t("createdAt")}</span>
                    </div>
                    {/* 모바일에서는 제목 아래에 작성자와 날짜를 배치하고 제목 전체를 읽을 수 있게 줄바꿈한다. */}
                    <ul className="divide-y divide-slate-100 border-t border-slate-200 sm:border-t-0 dark:divide-white/10 dark:border-white/10">
                        {data.items.map((entry) => (
                            <li key={entry.id}>
                                <Link
                                    href={boardPath(board, entry.id)}
                                    className={cn(
                                        BOARD_ROW_LAYOUT,
                                        "group min-h-15 grid-cols-[minmax(0,1fr)_auto_1rem] gap-y-1 py-3",
                                        "hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2",
                                        "focus-visible:outline-violet-500 dark:hover:bg-white/5",
                                    )}
                                >
                                    <span className="col-span-2 flex min-w-0 items-start gap-2 sm:col-span-1">
                                        {entry.locked && (
                                            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-300" aria-hidden="true" />
                                        )}
                                        <span className="min-w-0 text-sm font-semibold wrap-anywhere group-hover:text-violet-700 dark:group-hover:text-violet-300">
                                            {entry.locked ? t("secretPost") : (!originals && entry.translatedTitle) || entry.title}
                                        </span>
                                    </span>
                                    {entry.locked ? (
                                        <span className="text-sm text-slate-500" aria-hidden="true">
                                            <span className="hidden sm:inline">—</span>
                                        </span>
                                    ) : (
                                        <span className="truncate text-xs text-slate-500 sm:text-sm">
                                            {entry.author ?? t("anonymousAuthor")}
                                        </span>
                                    )}
                                    <time dateTime={entry.createdAt} className="text-right text-xs whitespace-nowrap text-slate-500 sm:text-sm">
                                        {dateFormat.format(new Date(entry.createdAt))}
                                    </time>
                                    <ChevronRight
                                        className="col-start-3 row-span-2 row-start-1 size-4 text-slate-400 sm:col-start-4 sm:row-span-1"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </>
            ) : (
                <div className="flex flex-col items-center gap-3 border-t border-slate-200 px-4 py-12 text-center dark:border-white/10">
                    <ClipboardList className="size-7 text-slate-400" aria-hidden="true" />
                    <p className="text-sm text-slate-500">{t("empty")}</p>
                </div>
            )}
            {(page > 0 || data?.hasMore) && (
                <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200 px-4 py-3 dark:border-white/10">
                    <button
                        type="button"
                        disabled={page === 0}
                        className={boardSecondaryButton}
                        onClick={() => setPage((value) => value - 1)}
                    >
                        <ChevronLeft className="size-4" aria-hidden="true" />
                        {t("previous")}
                    </button>
                    <span className="text-sm text-slate-500" aria-live="polite">{t("page", { number: page + 1 })}</span>
                    <button
                        type="button"
                        disabled={!data?.hasMore}
                        className={boardSecondaryButton}
                        onClick={() => setPage((value) => value + 1)}
                    >
                        {t("next")}
                        <ChevronRight className="size-4" aria-hidden="true" />
                    </button>
                </div>
            )}
        </>
    );
}

// 게시판과 선택한 글을 URL에 보존해 공유와 뒤로 가기를 지원한다.
function boardPath(board: Board, post?: string) {
    return `${ROUTES.BOARDS}?board=${board}${post ? `&post=${post}` : ""}`;
}
