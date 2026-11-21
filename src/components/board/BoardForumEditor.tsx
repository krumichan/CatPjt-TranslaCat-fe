"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { boardError } from "@/services/board/boardService";
import { BOARD_TYPES, type Board, type BoardForum } from "@/types/board";
import { boardErrorStyle, boardInput, boardPrimaryButton } from "./boardStyles";

/** 관리자가 이름과 이용 유형을 정해 독립 게시판을 개설한다. */
export function BoardForumEditor({ create, onCreated }: {
    create: (name: string, type: Board) => Promise<BoardForum>;
    onCreated: (forum: BoardForum) => void;
}) {
    const t = useTranslations("Board");
    const [name, setName] = useState("");
    const [type, setType] = useState<Board>("MEMBER");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 실패하면 입력을 유지하고, 개설에 성공하면 새 게시판으로 이동한다.
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const trimmedName = name.trim();
        if (busy || !trimmedName) {
            return;
        }

        setBusy(true);
        setError(null);
        try {
            const forum = await create(trimmedName, type);
            setName("");
            setType("MEMBER");
            onCreated(forum);
        } catch (failure) {
            setError(boardError(failure));
        } finally {
            setBusy(false);
        }
    }

    return (
        <details className="mb-4 rounded-xl border border-slate-200 dark:border-white/10">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">{t("createForum")}</summary>
            <form onSubmit={submit} className="space-y-3 px-4 pb-4">
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm">
                        {t("forumName")}
                        <input
                            className={boardInput}
                            value={name}
                            maxLength={60}
                            required
                            disabled={busy}
                            onChange={(event) => setName(event.target.value)}
                        />
                    </label>
                    <label className="grid gap-2 text-sm">
                        {t("forumType")}
                        <select
                            className={boardInput}
                            value={type}
                            disabled={busy}
                            onChange={(event) => {
                                const selected = BOARD_TYPES.find((item) => item === event.target.value);
                                if (selected) {
                                    setType(selected);
                                }
                            }}
                        >
                            {BOARD_TYPES.map((item) => <option key={item} value={item}>{t(item)}</option>)}
                        </select>
                    </label>
                </div>
                {error && <p role="alert" className={boardErrorStyle}>{t(error)}</p>}
                <button type="submit" className={boardPrimaryButton} disabled={busy || !name.trim()}>
                    {t(busy ? "saving" : "createForum")}
                </button>
            </form>
        </details>
    );
}
