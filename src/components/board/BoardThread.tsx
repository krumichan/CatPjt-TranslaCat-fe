"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import useSWR from "swr";

import ConfirmModal from "@/components/common/ConfirmModal";
import { boardError, type BoardApi } from "@/services/board/boardService";
import type { Board, BoardDraft, BoardEntry, BoardLocale } from "@/types/board";
import { BoardComposer, BoardUnlockForm } from "./BoardForms";
import { boardErrorStyle, boardPrimaryButton, boardSecondaryButton } from "./boardStyles";

const MAX_REPLY_DEPTH = 8;

interface ThreadContext {
    api: BoardApi;
    board: Board;
    post: string;
    locale: BoardLocale;
    login: string;
}

export function BoardThread({ onDeleted, ...context }: ThreadContext & { onDeleted: () => void }) {
    const t = useTranslations("Board");
    const { api, board, post, locale, login } = context;
    const { data, error, mutate } = useSWR(
        ["board-post", login, board, post, locale],
        () => api.post(post, locale),
        {
            refreshInterval: (entry) => entry?.translating || (entry?.secret && !entry.locked) ? 3000 : 0,
            shouldRetryOnError: false,
            revalidateIfStale: true,
        },
    );

    if (error) return <p role="alert" className={boardErrorStyle}>{t(boardError(error))}</p>;
    if (!data) return <p role="status">{t("loading")}</p>;
    if (data.locked) {
        return <BoardUnlockForm post unlock={async (password) => {
            await api.unlock(post, undefined, password);
            await mutate();
        }} />;
    }

    return (
        <>
            <BoardEntryContent entry={data} context={context} isPost
                onUpdated={async () => { await mutate(); }} onDeleted={onDeleted} />
            <section aria-label={t("comments")} className="space-y-4 border-t border-slate-200 pt-5 dark:border-white/10">
                <h2 className="text-lg font-semibold">{t("comments")}</h2>
                <BoardReplyList context={context} protectedThread={data.secret} />
            </section>
        </>
    );
}

function BoardReplyList({ context, parent, protectedThread = false, depth = 1 }: {
    context: ThreadContext;
    parent?: string;
    protectedThread?: boolean;
    depth?: number;
}) {
    const t = useTranslations("Board");
    const { api, board, post, locale, login } = context;
    const [page, setPage] = useState(0);
    const [composing, setComposing] = useState(false);
    const { data, error, mutate } = useSWR(
        ["board-replies", login, board, post, parent ?? "", locale, page],
        () => api.replies(post, parent, locale, page),
        {
            refreshInterval: (current) => protectedThread || current?.items.some((entry) =>
                entry.translating || entry.secret && !entry.locked) ? 3000 : 0,
            shouldRetryOnError: false,
        },
    );

    async function saveReply(draft: BoardDraft) {
        // 새 답글을 저장한 뒤 현재 스레드 목록의 잠금·번역 상태를 다시 읽는다.
        await api.reply(post, parent, draft);
        setComposing(false);
        await mutate();
    }

    if (error) return <p role="alert" className={boardErrorStyle}>{t(boardError(error))}</p>;
    if (!data) return <p role="status">{t("loading")}</p>;

    return (
        <div className="space-y-3">
            {data.items.map((entry) => (
                <div key={entry.id} className="space-y-3 rounded-xl border border-slate-100 p-3 sm:p-4 dark:border-white/10">
                    {entry.locked ? (
                        <BoardUnlockForm post={false} unlock={async (password) => {
                            await api.unlock(post, entry.id, password);
                            await mutate();
                        }} />
                    ) : (
                        <BoardReply entry={entry} context={context} depth={depth}
                            onChanged={async () => { await mutate(); }} />
                    )}
                </div>
            ))}
            {!data.items.length && !parent && <p className="text-sm text-slate-500">{t("noComments")}</p>}
            {(page > 0 || data.hasMore) && (
                <div className="flex gap-2">
                    <button type="button" className={boardSecondaryButton} disabled={!page}
                        onClick={() => setPage((value) => value - 1)}>{t("previous")}</button>
                    <button type="button" className={boardSecondaryButton} disabled={!data.hasMore}
                        onClick={() => setPage((value) => value + 1)}>{t("next")}</button>
                </div>
            )}
            {composing ? (
                <BoardComposer board={board} api={api} post={false} save={saveReply} close={() => setComposing(false)} />
            ) : (
                <button type="button" className={boardPrimaryButton}
                    onClick={() => setComposing(true)}>{t(parent ? "newReply" : "newComment")}</button>
            )}
        </div>
    );
}

function BoardReply({ entry, context, depth, onChanged }: {
    entry: BoardEntry;
    context: ThreadContext;
    depth: number;
    onChanged: () => Promise<void>;
}) {
    const t = useTranslations("Board");
    const [expanded, setExpanded] = useState(false);

    return (
        <>
            <BoardEntryContent entry={entry} context={context} onUpdated={onChanged} onDeleted={onChanged} />
            {depth < MAX_REPLY_DEPTH && (
                <button type="button" className="text-sm font-medium text-violet-600 dark:text-violet-300"
                    aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
                    {t(expanded ? "hideReplies" : "showReplies")}
                </button>
            )}
            {expanded && (
                <div className="border-l border-slate-200 pl-2 sm:pl-4 dark:border-white/10">
                    <BoardReplyList context={context} parent={entry.id} protectedThread={entry.secret} depth={depth + 1} />
                </div>
            )}
        </>
    );
}

function BoardEntryContent({ context, entry, isPost = false, onUpdated, onDeleted }: {
    context: ThreadContext;
    entry: BoardEntry;
    isPost?: boolean;
    onUpdated: () => Promise<void>;
    onDeleted: () => void | Promise<void>;
}) {
    const t = useTranslations("Board");
    const { api, post, board, locale } = context;
    const [original, setOriginal] = useState(false);
    const [editing, setEditing] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const reply = isPost ? undefined : entry.id;
    const hasTranslation = Boolean(entry.translatedTitle || entry.translatedContent);

    async function deleteEntry() {
        setBusy(true);
        setError(null);

        // 삭제가 성공하면 현재 화면 또는 부모 댓글 목록을 갱신한다.
        try {
            await api.remove(post, reply);
            setConfirm(false);
            await onDeleted();
        } catch (failure) {
            setConfirm(false);
            setError(boardError(failure));
        } finally {
            setBusy(false);
        }
    }

    async function download(id: string) {
        setError(null);
        try {
            // 다운로드 직전에 새 서명 URL을 발급받고 다른 사이트로 Referrer를 보내지 않는다.
            const { url } = await api.download(post, id);
            const link = document.createElement("a");
            link.href = url;
            link.rel = "noreferrer";
            link.target = "_blank";
            link.click();
        } catch (failure) {
            setError(boardError(failure));
        }
    }

    if (editing) {
        return <BoardComposer board={board} api={api} post={isPost} initial={entry}
            close={() => setEditing(false)} save={async (draft) => {
                await api.update(post, reply, draft);
                setEditing(false);
                await onUpdated();
            }} />;
    }

    return (
        <article className="space-y-3">
            {isPost && <h2 className="break-words text-2xl font-bold">
                {(!original && entry.translatedTitle) || entry.title}
            </h2>}
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                <span>{entry.author ?? t("anonymousAuthor")}</span>
                <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString(locale)}</time>
                {entry.secret && <span>{t(isPost ? "secretPost" : "secretReply")}</span>}
            </div>
            <p className="whitespace-pre-wrap break-words leading-relaxed">
                {(!original && entry.translatedContent) || entry.content}
            </p>
            {entry.translating && <p role="status" className="text-xs text-slate-500">{t("translating")}</p>}
            {(hasTranslation || entry.mine) && (
                <div className="flex flex-wrap gap-2">
                    {hasTranslation && (
                        <button type="button" className={boardSecondaryButton} onClick={() => setOriginal((value) => !value)}>
                            {t(original ? "showTranslation" : "showOriginal")}
                        </button>
                    )}
                    {entry.mine && (
                        <>
                            <button type="button" className={boardSecondaryButton} onClick={() => setEditing(true)}>
                                {t("edit")}
                            </button>
                            <button type="button" className={boardSecondaryButton} onClick={() => setConfirm(true)}>
                                {t("delete")}
                            </button>
                        </>
                    )}
                </div>
            )}
            {entry.attachments.length > 0 && (
                <ul aria-label={t("attachments")} className="space-y-2">
                    {entry.attachments.map((file) => (
                        <li key={file.id}>
                            <button type="button" className={boardSecondaryButton} onClick={() => void download(file.id)}>
                                <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span className="break-all">{file.filename}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {error && <p role="alert" className={boardErrorStyle}>{t(error)}</p>}
            {confirm && (
                <ConfirmModal
                    isOpen
                    title={t("delete")}
                    description={t("deleteQuestion")}
                    confirmLabel={t("delete")}
                    cancelLabel={t("cancel")}
                    variant="danger"
                    isLoading={busy}
                    onConfirm={deleteEntry}
                    onClose={() => setConfirm(false)}
                />
            )}
        </article>
    );
}
