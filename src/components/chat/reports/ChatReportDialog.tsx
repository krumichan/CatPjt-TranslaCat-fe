"use client";

import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { REPORT_REASONS, createReportRequest, type ReportReason, type ReportRequest, type ReportTarget } from "@/features/chat-reports/model";
import { reportCopy } from "@/features/chat-reports/copy";
import { chatReportService, ChatReportError } from "@/services/chat/chatReportService";

// 응답 유실 뒤 같은 화면을 다시 열어도 같은 신고만 명시적으로 재전송한다. 본문은 영속 저장/로그에 남기지 않는다.
const pending = new Map<string, { request: ReportRequest; expires: number }>();
function keyFor(owner: string, target: ReportTarget) {
    return `${owner}:${target.roomId}:${target.targetType}:${"messageId" in target ? target.messageId : target.targetOpenChatMemberId ?? target.targetUserId}`;
}

export function ChatReportDialog({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
    const { data, status } = useSession();
    const owner = status === "authenticated" ? data.loginSessionId : null;
    return owner ? <OwnedReportDialog key={keyFor(owner, target)} owner={owner} target={target} onClose={onClose} /> : null;
}

function OwnedReportDialog({ owner, target, onClose }: { owner: string; target: ReportTarget; onClose: () => void }) {
    const copy = reportCopy(useLocale());
    const cacheKey = keyFor(owner, target);
    const cached = pending.get(cacheKey);
    const saved = cached && cached.expires > Date.now() ? cached.request : null;
    const [reason, setReason] = useState<ReportReason>(saved?.reason ?? "SPAM");
    const [detail, setDetail] = useState(saved?.detail ?? "");
    const [agreed, setAgreed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [attempted, setAttempted] = useState(!!saved);
    const [message, setMessage] = useState(saved ? copy.unknown : "");
    const [success, setSuccess] = useState(false);
    const mutation = useRef<ReportRequest | null>(saved);
    const running = useRef(false);
    const abort = useRef<AbortController | null>(null);
    const alive = useRef(true);
    const dialog = useRef<HTMLDivElement>(null);

    useEffect(() => {
        alive.current = true;
        const previous = document.activeElement as HTMLElement | null;
        dialog.current?.querySelector<HTMLElement>("select,button")?.focus();
        const keyboard = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
            if (event.key !== "Tab") return;
            const focusable = dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled),select:not(:disabled),textarea:not(:disabled),input:not(:disabled)");
            if (!focusable?.length) return;
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        document.addEventListener("keydown", keyboard);
        return () => { alive.current = false; abort.current?.abort(); document.removeEventListener("keydown", keyboard); previous?.focus(); };
    }, [onClose]);

    const submit = async () => {
        if (running.current || !agreed || success || document.visibilityState !== "visible") return;
        running.current = true;
        setBusy(true);
        setMessage("");
        const controller = new AbortController();
        abort.current = controller;
        try {
            // 송신 전에 요청 ID와 정확한 payload를 고정한다. double tap과 수동 재전송도 같은 ID를 사용한다.
            const request = mutation.current ?? createReportRequest(target, reason, detail, crypto.randomUUID());
            mutation.current = request;
            for (const [key, value] of pending) if (value.expires <= Date.now()) pending.delete(key);
            if (pending.size >= 20 && !pending.has(cacheKey)) pending.delete(pending.keys().next().value!);
            pending.set(cacheKey, { request, expires: Date.now() + 15 * 60_000 });
            setAttempted(true);
            const result = await chatReportService.create(target.roomId, request, { owner, signal: controller.signal });
            if (!alive.current || controller.signal.aborted) return;
            pending.delete(cacheKey);
            setSuccess(true);
            setMessage(`${copy.success} #${result.id}`);
        } catch (error) {
            if (!alive.current || controller.signal.aborted) return;
            const definite = error instanceof ChatReportError && [400, 403, 404, 422, 429].includes(error.status);
            if (definite) { pending.delete(cacheKey); mutation.current = null; setAttempted(false); }
            setMessage(definite ? copy.failed : copy.unknown);
        } finally {
            running.current = false;
            if (alive.current) setBusy(false);
        }
    };

    return <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4">
        <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="chat-report-title" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 text-slate-900 shadow-xl dark:bg-slate-900 dark:text-white">
            <div className="flex items-start justify-between gap-3"><h2 id="chat-report-title" className="text-xl font-black">{copy.title}</h2><button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600">{copy.close}</button></div>
            <p className="mt-3 break-words text-sm font-bold">{target.targetType === "MESSAGE" ? copy.message : copy.member} · {target.displayName}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{copy.notice}</p>
            {!success && <div className="mt-5 space-y-4">
                <label className="block text-sm font-bold">{copy.reason}<select value={reason} disabled={busy || attempted} onChange={event => setReason(event.target.value as ReportReason)} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">{REPORT_REASONS.map(value => <option key={value} value={value}>{copy.reasons[value]}</option>)}</select></label>
                <label className="block text-sm font-bold">{copy.detail}<textarea value={detail} disabled={busy || attempted} maxLength={2000} rows={4} onChange={event => setDetail(event.target.value)} className="mt-2 block w-full resize-y rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-600 dark:bg-slate-800" /><span className="text-xs font-normal text-slate-500">{detail.length}/2000</span></label>
                <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={agreed} disabled={busy} onChange={event => setAgreed(event.target.checked)} className="mt-1 size-5 shrink-0" />{copy.consent}</label>
                <button type="button" disabled={!agreed || busy} onClick={() => void submit()} className="min-h-12 w-full rounded-2xl bg-orange-500 px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? copy.sending : attempted ? copy.resend : copy.send}</button>
            </div>}
            {message && <p role="status" className="mt-4 break-words rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">{message}</p>}
        </div>
    </div>;
}
