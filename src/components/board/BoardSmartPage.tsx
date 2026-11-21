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
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import useSWR, { SWRConfig } from "swr";

import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { Link, useRouter } from "@/navigation";
import { boardDirectory, boardError, boardService, type BoardApi } from "@/services/board/boardService";
import { BOARD_TYPES, type BoardForum, type BoardLocale, type BoardSort } from "@/types/board";
import { BoardForumEditor } from "./BoardForumEditor";
import { BoardComposer } from "./BoardForms";
import { BoardThread } from "./BoardThread";
import { boardErrorStyle, boardPrimaryButton, boardSecondaryButton } from "./boardStyles";

const POST_ID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const BOARD_ROW_LAYOUT = cn(
    "grid items-center gap-x-4 px-4 sm:px-5",
    "sm:grid-cols-[minmax(0,1fr)_minmax(5rem,0.25fr)_6.75rem_3.75rem_1rem]",
);
const BOARD_SURFACE = "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900";

/** 로그인한 사용자에게 게시판 목록을 보여주고 주소에서 선택된 게시판을 연다. */
export function BoardSmartPage() {
    // 세션별로 게시판 목록을 읽어 관리자용 게시판이 계정 전환 후 남지 않게 한다.
    const { data: session, status } = useSession();
    const t = useTranslations("Board");
    const locale = useLocale();
    const params = useSearchParams();
    const router = useRouter();
    const login = session?.loginSessionId;
    const authenticated = status === "authenticated" && Boolean(login);
    const isAdmin = session?.user?.role === "ADMIN";
    const directory = useMemo(() => boardDirectory(login ?? ""), [login]);
    const { data: forums, error, mutate } = useSWR(
        authenticated ? ["board-directory", login] : null,
        directory.list,
        { shouldRetryOnError: false },
    );

    // 이전 글 주소는 서버에서 글의 실제 게시판을 찾는다. 새 주소는 게시판 ID를 직접 보존한다.
    const rawPost = params.get("post");
    const post = rawPost && POST_ID.test(rawPost) ? rawPost : null;
    const forumId = params.get("forum");
    const legacyBoard = params.get("board");
    const legacyType = BOARD_TYPES.find((type) => type === (legacyBoard ?? "MEMBER"));
    const legacyCategory = params.get("category");
    const locate = authenticated && !forumId && post && legacyType && (legacyType !== "ADMIN" || isAdmin);
    const { data: location, error: locationError } = useSWR(
        locate ? ["board-location", login, legacyType, post] : null,
        () => directory.locate(legacyType!, post!),
        { shouldRetryOnError: false },
    );
    const legacyForum = forums?.find(({ id, type }) => id === legacyCategory && type === legacyType);
    const selectedId = forumId ?? location?.id ?? legacyForum?.id ?? legacyType;
    const forum = forums?.find(({ id }) => id === selectedId);
    const sort: BoardSort = params.get("sort") === "POPULAR" ? "POPULAR" : "LATEST";

    // 학습 모드의 게시글 번역 언어는 기존과 같이 한국어를 사용한다.
    const language: BoardLocale = locale === "ja" || locale === "en" ? locale : "ko";

    // 등록 결과를 목록에 반영한 다음 새 게시판을 열고 서버 목록과 동기화한다.
    async function openCreatedForum(created: BoardForum) {
        await mutate((current) => [
            ...(current ?? []).filter(({ id }) => id !== created.id),
            created,
        ], { revalidate: false });
        router.push(boardPath(created.id));
        void mutate();
    }

    const failure = error || locationError;
    const waiting = status === "loading" || authenticated && (!forums || (Boolean(locate) && !location));

    return (
        <div className="mx-auto max-w-6xl space-y-5 px-4 pb-12 pt-28 sm:px-6">
            <header className={cn(BOARD_SURFACE, "px-4 pt-4 sm:px-6 sm:pt-5")}>
                <h1 className="mb-3 flex items-center gap-3 text-2xl font-bold tracking-tight sm:mb-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300">
                        <ClipboardList className="size-5" aria-hidden="true" />
                    </span>
                    {t("title")}
                </h1>
                {authenticated && forums && (
                    <nav aria-label={t("title")} className="max-h-40 overflow-y-auto border-t border-slate-100 dark:border-white/10">
                        <ul className="flex flex-wrap gap-x-1 gap-y-1 py-1">
                            {forums.map((item) => (
                                <li key={item.id} className="min-w-0 max-w-full">
                                    <Link
                                        href={boardPath(item.id)}
                                        aria-current={item.id === forum?.id ? "page" : undefined}
                                        className={cn(
                                            "inline-flex min-h-11 max-w-full flex-wrap items-center gap-x-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold wrap-anywhere sm:px-4",
                                            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet-500",
                                            item.id === forum?.id
                                                ? "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
                                        )}
                                    >
                                        {item.name ?? t(item.type)}
                                        {item.name && <span className="text-xs font-normal opacity-80">{t(item.type)}</span>}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                )}
                {authenticated && isAdmin && (
                    <BoardForumEditor create={directory.create} onCreated={(created) => void openCreatedForum(created)} />
                )}
            </header>
            {failure ? (
                <p role="alert" className={boardErrorStyle}>{t(boardError(failure))}</p>
            ) : waiting ? (
                <p role="status">{t("loading")}</p>
            ) : !authenticated || !login ? (
                <p className="rounded-xl border border-slate-200 p-6 dark:border-white/10">{t("loginRequired")}</p>
            ) : !forum ? (
                <p role="alert" className={boardErrorStyle}>{t("accessError")}</p>
            ) : (
                // 게시판 ID별로 글·댓글·잠금 해제 상태를 독립적으로 관리한다.
                <SWRConfig
                    key={`${login}:${forum.id}:${post ?? ""}:${language}:${sort}`}
                    value={{ provider: () => new Map() }}
                >
                    <BoardWorkspace forum={forum} post={post} language={language} login={login} sort={sort} />
                </SWRConfig>
            )}
        </div>
    );
}

// 같은 게시판의 목록과 글 상세가 세션으로 범위가 지정된 API를 공유한다.
function BoardWorkspace({ forum, post, language, login, sort }: {
    forum: BoardForum;
    post: string | null;
    language: BoardLocale;
    login: string;
    sort: BoardSort;
}) {
    const t = useTranslations("Board");
    const router = useRouter();
    const api = useMemo(() => boardService(forum.id, login), [forum.id, login]);

    return (
        <section
            aria-label={forum.name ?? t(forum.type)}
            className={cn(BOARD_SURFACE, "min-w-0", post && "space-y-5 p-4 sm:p-6")}
        >
            {post ? (
                <>
                    <Link href={boardPath(forum.id, sort)} className={boardSecondaryButton}>
                        <ChevronLeft className="size-4" aria-hidden="true" />
                        {t("back")}
                    </Link>
                    <BoardThread
                        board={forum.type}
                        post={post}
                        locale={language}
                        login={login}
                        api={api}
                        onDeleted={() => router.push(boardPath(forum.id, sort))}
                    />
                </>
            ) : (
                <BoardList forum={forum} locale={language} login={login} api={api} sort={sort} />
            )}
        </section>
    );
}

// 현재 게시판의 글 목록을 표시하고 목록에서 새 글을 작성한다.
function BoardList({ forum, locale, login, api, sort }: {
    forum: BoardForum;
    locale: BoardLocale;
    login: string;
    api: BoardApi;
    sort: BoardSort;
}) {
    // 페이지 이동과 원문 표시 여부는 현재 목록 화면에만 적용한다.
    const t = useTranslations("Board");
    const format = useFormatter();
    const router = useRouter();
    const [page, setPage] = useState(0);
    const [composing, setComposing] = useState(false);
    const [originals, setOriginals] = useState(false);

    // 요청 범위별로 목록을 나누고 번역 대기 중인 항목이 있을 때 목록을 갱신한다.
    const { data, isLoading, error, mutate } = useSWR(
        ["board-list", login, forum.id, locale, page, sort],
        () => api.list(locale, page, sort),
        {
            refreshInterval: (current) => current?.items.some((entry) => entry.translating) ? 2500 : 0,
            shouldRetryOnError: false,
        },
    );
    const dateFormat = useMemo(() => new Intl.DateTimeFormat(locale), [locale]);

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                <h2 className="text-lg font-bold">{forum.name ?? t(forum.type)}</h2>
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
            <div className="flex flex-wrap items-center gap-3 px-4 pb-4 sm:px-5">
                <nav aria-label={t("sort")} className="inline-flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5">
                    {(["LATEST", "POPULAR"] as const).map((order) => (
                        <Link
                            key={order}
                            href={boardPath(forum.id, order)}
                            aria-current={order === sort ? "page" : undefined}
                            className={cn(
                                "rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300",
                                "aria-[current=page]:bg-white aria-[current=page]:text-violet-700",
                                "dark:aria-[current=page]:bg-white/10 dark:aria-[current=page]:text-violet-300",
                            )}
                        >
                            {t(order === "POPULAR" ? "popular" : "latest")}
                        </Link>
                    ))}
                </nav>
            </div>
            {composing && (
                <div className="px-4 pb-4 sm:px-5">
                    <BoardComposer
                        board={forum.type}
                        api={api}
                        post
                        close={() => setComposing(false)}
                        save={async (draft) => {
                            // 저장에 성공하면 목록을 갱신하고 새 게시글로 이동한다.
                            const created = await api.createPost(draft);
                            void mutate();
                            router.push(boardPath(forum.id, "LATEST", created.id));
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
                        <span className="text-right">{t("views")}</span>
                    </div>
                    {/* 모바일에서는 제목 아래에 작성자와 날짜를 배치하고 제목 전체를 읽을 수 있게 줄바꿈한다. */}
                    <ul className="divide-y divide-slate-100 border-t border-slate-200 sm:border-t-0 dark:divide-white/10 dark:border-white/10">
                        {data.items.map((entry) => (
                            <li key={entry.id}>
                                <Link
                                    href={boardPath(forum.id, sort, entry.id)}
                                    className={cn(
                                        BOARD_ROW_LAYOUT,
                                        "group min-h-15 grid-cols-[minmax(0,1fr)_auto_auto_1rem] gap-y-1 py-3",
                                        "hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2",
                                        "focus-visible:outline-violet-500 dark:hover:bg-white/5",
                                    )}
                                >
                                    <span className="col-span-3 flex min-w-0 flex-wrap items-start gap-2 sm:col-span-1">
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
                                    <span className="text-right text-xs whitespace-nowrap text-slate-500 sm:text-sm">
                                        {!entry.locked && entry.viewCount != null && (
                                            <>
                                                <span className="sm:hidden">{t("viewCount", { count: entry.viewCount })}</span>
                                                <span className="hidden sm:inline">{format.number(entry.viewCount)}</span>
                                            </>
                                        )}
                                    </span>
                                    <ChevronRight
                                        className="col-start-4 row-span-2 row-start-1 size-4 text-slate-400 sm:col-start-5 sm:row-span-1"
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
                    <p className="text-sm text-slate-500">{t(sort === "POPULAR" ? "emptyPopular" : "empty")}</p>
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

// 게시판 ID와 정렬·게시글을 주소에 남겨 공유와 뒤로 가기를 지원한다.
function boardPath(forumId: string, sort: BoardSort = "LATEST", post?: string) {
    const query = new URLSearchParams({ forum: forumId });
    if (sort === "POPULAR") {
        query.set("sort", sort);
    }
    if (post) {
        query.set("post", post);
    }
    return `${ROUTES.BOARDS}?${query}`;
}
