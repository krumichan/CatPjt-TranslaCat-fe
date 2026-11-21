"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { boardError } from "@/services/board/boardService";
import type { BoardForum } from "@/types/board";
import { boardErrorStyle, boardInput, boardPrimaryButton } from "@/components/board/boardStyles";

/** 설정에서 선택된 일반 또는 익명 그룹에 새 카테고리를 추가한다. */
export function BoardForumEditor({ create }: {
    create: (name: string) => Promise<BoardForum>;
}) {
    const t = useTranslations("Board");
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [created, setCreated] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 저장 결과를 현재 설정에 표시하고 실패하면 이름 입력을 유지한다.
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const trimmedName = name.trim();
        if (busy || !trimmedName) {
            return;
        }

        setBusy(true);
        setCreated(null);
        setError(null);
        try {
            const forum = await create(trimmedName);
            setName("");
            setCreated(forum.name ?? trimmedName);
        } catch (failure) {
            setError(boardError(failure));
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-40 grow space-y-1.5 text-sm font-medium">
                    <span className="block">{t("forumName")}</span>
                    <input
                        className={boardInput}
                        value={name}
                        maxLength={60}
                        required
                        disabled={busy}
                        onChange={(event) => setName(event.target.value)}
                    />
                </label>
                <button type="submit" className={boardPrimaryButton} disabled={busy || !name.trim()}>
                    {t(busy ? "saving" : "createForum")}
                </button>
            </div>
            {created && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">
                {t("categoryAdded", { name: created })}
            </p>}
            {error && <p role="alert" className={boardErrorStyle}>{t(error)}</p>}
        </form>
    );
}
