"use client";

import { useRef, useState } from "react";
import { Eye, ThumbsDown, ThumbsUp } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { boardError, type BoardApi } from "@/services/board/boardService";
import type { BoardEntry, BoardReaction, BoardReactions } from "@/types/board";
import { boardErrorStyle, boardSecondaryButton } from "./boardStyles";

/** 열람이 허용된 게시글의 조회수와 현재 회원의 투표 동작을 표시한다. */
export function BoardPostActions({ entry, api, onVoted }: {
    entry: BoardEntry;
    api: BoardApi;
    onVoted: (result: BoardReactions) => Promise<void>;
}) {
    const t = useTranslations("Board");
    const format = useFormatter();
    const pending = useRef(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const reactions = entry.reactions;

    // 선택 값을 서버에 보내 빠른 연속 클릭과 재시도에서 중복 투표를 막는다.
    async function vote(selected: BoardReaction) {
        if (!reactions || pending.current) {
            return;
        }

        pending.current = true;
        setBusy(true);
        setError(null);

        // 같은 버튼을 다시 누르면 취소하고, 다른 버튼은 기존 선택을 교체한다.
        const reaction = reactions.mine === selected ? "NONE" : selected;
        try {
            const result = await api.vote(entry.id, reaction);
            await onVoted(result);
        } catch (failure) {
            setError(boardError(failure));
        } finally {
            pending.current = false;
            setBusy(false);
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                {reactions && (
                    <>
                        <button
                            type="button"
                            aria-pressed={reactions.mine === "LIKE"}
                            disabled={busy}
                            className={cn(boardSecondaryButton,
                                "aria-pressed:border-violet-500 aria-pressed:text-violet-600 dark:aria-pressed:text-violet-300")}
                            onClick={() => void vote("LIKE")}
                        >
                            <ThumbsUp className="size-4" aria-hidden="true" />
                            {t("like")} {format.number(reactions.likes)}
                        </button>
                        <button
                            type="button"
                            aria-pressed={reactions.mine === "DISLIKE"}
                            disabled={busy}
                            className={cn(boardSecondaryButton,
                                "aria-pressed:border-violet-500 aria-pressed:text-violet-600 dark:aria-pressed:text-violet-300")}
                            onClick={() => void vote("DISLIKE")}
                        >
                            <ThumbsDown className="size-4" aria-hidden="true" />
                            {t("dislike")} {format.number(reactions.dislikes)}
                        </button>
                    </>
                )}
                {entry.viewCount != null && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                        <Eye className="size-4" aria-hidden="true" />
                        {t("viewCount", { count: entry.viewCount })}
                    </span>
                )}
            </div>
            {error && <p role="alert" className={boardErrorStyle}>{t(error)}</p>}
        </div>
    );
}
