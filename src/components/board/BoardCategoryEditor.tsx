"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { boardError, type BoardApi } from "@/services/board/boardService";
import type { BoardCategory } from "@/types/board";
import { boardErrorStyle, boardInput, boardPrimaryButton } from "./boardStyles";

/** 관리자가 선택된 게시판의 카테고리를 만들거나 이름을 바꾼다. */
export function BoardCategoryEditor({ api, categories, onSaved }: {
    api: BoardApi;
    categories: BoardCategory[];
    onSaved: () => Promise<void>;
}) {
    const t = useTranslations("Board");
    const [editing, setEditing] = useState("");
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 중복이나 서버 오류가 발생하면 현재 이름 입력을 유지한다.
    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy || !name.trim()) {
            return;
        }
        setBusy(true);
        setError(null);

        // 이름 저장 후 목록과 글쓰기에서 공유하는 선택지를 다시 읽는다.
        try {
            await api.saveCategory(name.trim(), editing || undefined);
            await onSaved();
            setEditing("");
            setName("");
        } catch (failure) {
            setError(boardError(failure));
        } finally {
            setBusy(false);
        }
    }

    return (
        <details className="mx-4 mb-4 rounded-xl border border-slate-200 dark:border-white/10 sm:mx-5">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">{t("manageCategories")}</summary>
            <form onSubmit={save} className="space-y-3 px-4 pb-4">
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm">
                        {t("category")}
                        <select
                            className={boardInput}
                            value={editing}
                            disabled={busy}
                            onChange={(event) => {
                                const id = event.target.value;
                                setEditing(id);
                                setName(categories.find((category) => category.id === id)?.name ?? "");
                                setError(null);
                            }}
                        >
                            <option value="">{t("newCategory")}</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                        </select>
                    </label>
                    <label className="grid gap-2 text-sm">
                        {t("categoryName")}
                        <input
                            className={boardInput}
                            value={name}
                            maxLength={60}
                            required
                            disabled={busy}
                            onChange={(event) => setName(event.target.value)}
                        />
                    </label>
                </div>
                {error && <p role="alert" className={boardErrorStyle}>{t(error)}</p>}
                <button type="submit" className={boardPrimaryButton} disabled={busy || !name.trim()}>
                    {t(busy ? "saving" : "save")}
                </button>
            </form>
        </details>
    );
}
