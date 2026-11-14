"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";

import { boardError, BOARD_FILE_LIMIT, BOARD_R2_LIMIT, type BoardApi } from "@/services/board/boardService";
import type { Board, BoardDraft, BoardEntry } from "@/types/board";
import { boardErrorStyle, boardInput, boardPrimaryButton, boardSecondaryButton } from "./boardStyles";

interface SelectedFile {
    key: number;
    file: File;
    uploadId?: string;
    progress: number;
}

export function BoardComposer({ board, api, post, initial, save, close }: {
    board: Board;
    api: BoardApi;
    post: boolean;
    initial?: BoardEntry;
    save: (draft: BoardDraft) => Promise<void>;
    close: () => void;
}) {
    const t = useTranslations("Board");
    const [title, setTitle] = useState(initial?.title ?? "");
    const [content, setContent] = useState(initial?.content ?? "");
    const [secret, setSecret] = useState(initial?.secret ?? false);
    const [password, setPassword] = useState("");
    const [files, setFiles] = useState<SelectedFile[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const upload = useRef<AbortController | null>(null);
    const nextFileKey = useRef(0);

    useEffect(() => () => upload.current?.abort(), []);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (upload.current) return;

        // 비밀번호 바이트 범위를 검사하고 실패해도 편집 내용을 유지한다.
        setError(null);
        const passwordBytes = new TextEncoder().encode(password).length;
        if (secret && (Array.from(password).length < 8 || passwordBytes > 72 || !password.trim())) {
            setError("passwordLength");
            return;
        }

        const controller = new AbortController();
        upload.current = controller;
        setBusy(true);

        try {
            // 성공한 파트와 업로드 ID를 보존해 다음 저장 시 중단 지점에서 이어간다.
            const attachments: string[] = [];
            for (const selected of files) {
                const id = await api.upload(
                    selected.file,
                    selected.uploadId,
                    controller.signal,
                    (uploadId) => setFiles((old) => old.map((file) =>
                        file.key === selected.key ? { ...file, uploadId } : file)),
                    (progress) => setFiles((old) => old.map((file) =>
                        file.key === selected.key ? { ...file, progress } : file)),
                );
                attachments.push(id);
            }

            // 첨부 검증이 끝난 다음 본문과 첨부 참조를 함께 저장한다.
            controller.signal.throwIfAborted();
            await save({
                ...(post ? { title, attachments } : {}),
                content,
                ...(secret ? { password } : {}),
            });
        } catch (failure) {
            if (!controller.signal.aborted) {
                setError(boardError(failure));
            }
        } finally {
            upload.current = null;
            setBusy(false);
        }
    }

    function chooseFiles(list: FileList | null) {
        if (!list) return;

        // 게시판별 파일당 크기와 게시글당 첨부 개수를 전송 전에 확인한다.
        const max = board === "ADMIN" ? BOARD_R2_LIMIT : BOARD_FILE_LIMIT;
        const additions = Array.from(list);
        if (additions.some((file) => file.size < 1 || file.size > max)) {
            setError(board === "ADMIN" ? "r2FileSize" : "memberFileSize");
            return;
        }
        if ((initial?.attachments.length ?? 0) + files.length + additions.length > 20) {
            setError("fileCount");
            return;
        }

        setError(null);
        const selected = additions.map((file) => ({ key: nextFileKey.current++, file, progress: 0 }));
        setFiles((old) => [...old, ...selected]);
    }

    return (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            {post && (
                <label className="grid gap-2 text-sm font-medium">
                    {t("postTitle")}
                    <input className={boardInput} value={title} maxLength={200} required disabled={busy}
                        onChange={(event) => setTitle(event.target.value)} />
                </label>
            )}
            <label className="grid gap-2 text-sm font-medium">
                {t(post ? "body" : "commentBody")}
                <textarea className={boardInput} value={content} maxLength={12000} required disabled={busy}
                    rows={post ? 8 : 3} onChange={(event) => setContent(event.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={secret} disabled={busy}
                    onChange={(event) => setSecret(event.target.checked)} />
                {t(post ? "secretPost" : "secretReply")}
            </label>
            {secret && (
                <div className="space-y-2">
                    <label className="grid gap-2 text-sm font-medium">
                        {t(initial?.secret ? "newPassword" : "password")}
                        <input className={boardInput} type="password" autoComplete="new-password"
                            value={password} required disabled={busy} maxLength={72}
                            onChange={(event) => setPassword(event.target.value)} />
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("translationPrivacy")}</p>
                </div>
            )}
            {post && (
                <div className="space-y-2 text-sm">
                    <label className="grid gap-2 font-medium">
                        {t("attachments")}
                        <input type="file" multiple disabled={busy} className={boardInput}
                            onChange={(event) => {
                                chooseFiles(event.target.files);
                                event.target.value = "";
                            }} />
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t(board === "ADMIN" ? "r2Limit" : "memberLimit")}
                    </p>
                    {files.map((selected) => (
                        <div key={selected.key} className="flex items-center justify-between gap-3">
                            <span className="min-w-0 break-all">{selected.file.name}</span>
                            {selected.uploadId && (
                                <progress className="w-16" value={selected.progress} max={1}
                                    aria-label={t("uploadProgress")} />
                            )}
                            <button type="button" className={boardSecondaryButton} disabled={busy}
                                onClick={() => setFiles((old) => old.filter((file) => file.key !== selected.key))}>
                                {t("removeFile")}
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {error && <p role="alert" className={boardErrorStyle}>{t(error)}</p>}
            <div className="flex flex-wrap gap-2">
                <button type="submit" className={boardPrimaryButton} disabled={busy}>
                    {t(busy ? "saving" : "save")}
                </button>
                <button type="button" className={boardSecondaryButton} disabled={busy} onClick={close}>
                    {t("cancel")}
                </button>
            </div>
        </form>
    );
}

export function BoardUnlockForm({ post, unlock }: {
    post: boolean;
    unlock: (password: string) => Promise<void>;
}) {
    const t = useTranslations("Board");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setError(null);

        // 성공하면 서버의 잠금 상태를 다시 읽고 입력 필드에서 비밀번호를 지운다.
        try {
            await unlock(password);
            setPassword("");
        } catch (failure) {
            setError(boardError(failure));
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-white/5">
            <p className="flex items-center gap-2 text-sm font-semibold">
                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                {t(post ? "secretPost" : "secretReply")}
            </p>
            <label className="grid gap-2 text-sm">
                {t("password")}
                <input className={boardInput} type="password" autoComplete="off" required maxLength={72}
                    value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error && <p role="alert" className={boardErrorStyle}>{t(error)}</p>}
            <button className={boardPrimaryButton} disabled={busy}>{t("unlock")}</button>
        </form>
    );
}
