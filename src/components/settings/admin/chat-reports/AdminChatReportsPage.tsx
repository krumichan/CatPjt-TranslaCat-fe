"use client";

import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import SettingsSubPageHeader from "@/components/settings/SettingsSubPageHeader";
import { reportCopy } from "@/features/chat-reports/copy";
import { REPORT_STATUSES, type ReportDetail, type ReportList, type ReportStatus } from "@/features/chat-reports/model";
import { chatReportService } from "@/services/chat/chatReportService";

export default function AdminChatReportsPage() {
    const { data: session, status } = useSession();
    const copy = reportCopy(useLocale());
    if (status === "loading") return <p className="px-6 pt-24">{copy.loading}</p>;
    if (session?.user.role !== "ADMIN" || !session.loginSessionId) return <p className="px-6 pt-24" role="alert">{copy.forbidden}</p>;
    return <OwnedReports key={session.loginSessionId} owner={session.loginSessionId} />;
}

function OwnedReports({ owner }: { owner: string }) {
    const locale = useLocale();
    const copy = reportCopy(locale);
    const [filter, setFilter] = useState<ReportStatus | "">("PENDING");
    const [list, setList] = useState<ReportList>({ reports: [], hasNext: false, nextCursorId: null });
    const [detail, setDetail] = useState<ReportDetail | null>(null);
    const [status, setStatus] = useState<ReportStatus>("IN_REVIEW");
    const [note, setNote] = useState("");
    const [confirmed, setConfirmed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [reloadRequired, setReloadRequired] = useState(false);
    const [message, setMessage] = useState("");
    const lifetime = useRef(true);
    const listGeneration = useRef(0);
    const detailGeneration = useRef(0);
    const requests = useRef(new Set<AbortController>());
    const mutation = useRef(false);
    const listLock = useRef(false);

    useEffect(() => {
        lifetime.current = true;
        const activeRequests = requests.current;
        return () => { lifetime.current = false; activeRequests.forEach(value => value.abort()); activeRequests.clear(); };
    }, []);

    const loadList = useCallback(async (cursor: number | null) => {
        if (listLock.current || mutation.current) return;
        listLock.current = true;
        const generation = ++listGeneration.current;
        const controller = new AbortController();
        requests.current.add(controller);
        setLoading(true);
        setMessage("");
        try {
            const result = await chatReportService.list(filter, cursor, { owner, signal: controller.signal });
            if (!lifetime.current || generation !== listGeneration.current) return;
            if (cursor !== null && result.hasNext && result.nextCursorId === cursor) throw new Error("REPORT_CURSOR_NOT_ADVANCING");
            setList(previous => ({ ...result, reports: cursor === null ? result.reports : [...previous.reports, ...result.reports.filter(item => !previous.reports.some(old => old.id === item.id))] }));
        } catch {
            if (lifetime.current && !controller.signal.aborted) setMessage(copy.failed);
        } finally {
            requests.current.delete(controller);
            listLock.current = false;
            if (lifetime.current && generation === listGeneration.current) setLoading(false);
        }
    }, [owner, filter, copy.failed]);

    useEffect(() => { void loadList(null); }, [loadList]);

    const select = async (id: number) => {
        if (mutation.current) return;
        const generation = ++detailGeneration.current;
        const controller = new AbortController();
        requests.current.add(controller);
        setDetail(null);
        setConfirmed(false);
        setMessage("");
        try {
            const result = await chatReportService.detail(id, { owner, signal: controller.signal });
            if (!lifetime.current || generation !== detailGeneration.current) return;
            setDetail(result);
            setStatus(result.status === "PENDING" ? "IN_REVIEW" : result.status);
            setNote(result.reviewNote ?? "");
            setReloadRequired(false);
        } catch {
            if (lifetime.current && generation === detailGeneration.current && !controller.signal.aborted) setMessage(copy.failed);
        } finally { requests.current.delete(controller); }
    };

    const review = async () => {
        if (!detail || !confirmed || mutation.current || reloadRequired || document.visibilityState !== "visible") return;
        mutation.current = true;
        setSaving(true);
        setMessage("");
        const controller = new AbortController();
        requests.current.add(controller);
        const generation = detailGeneration.current;
        try {
            // 명시적 확인과 조회한 revision으로 한 번만 보낸다. 응답 유실 시 자동 재전송하지 않는다.
            const result = await chatReportService.review(detail.id, status, note, detail.version, { owner, signal: controller.signal });
            if (!lifetime.current || generation !== detailGeneration.current) return;
            setDetail(result);
            setNote(result.reviewNote ?? "");
            setStatus(result.status);
            setConfirmed(false);
            setList(previous => ({ ...previous, reports: previous.reports.map(item => item.id === result.id ? result : item) }));
            setMessage(copy.saved);
        } catch {
            if (lifetime.current && !controller.signal.aborted) {
                setReloadRequired(true);
                setConfirmed(false);
                setMessage(copy.conflict);
            }
        } finally {
            requests.current.delete(controller);
            mutation.current = false;
            if (lifetime.current) setSaving(false);
        }
    };

    const format = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
    return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 pt-24 sm:px-6">
        <SettingsSubPageHeader eyebrow="Admin · Chat" title={copy.admin} description={copy.adminNotice} />
        <div className="flex flex-wrap gap-3"><select aria-label={copy.all} value={filter} disabled={loading || saving} onChange={event => setFilter(event.target.value as ReportStatus | "")} className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"><option value="">{copy.all}</option>{REPORT_STATUSES.map(value => <option key={value} value={value}>{copy.statuses[value]}</option>)}</select><button type="button" disabled={loading || saving} onClick={() => void loadList(null)} className="rounded-xl border border-slate-300 px-4 py-3 font-bold disabled:opacity-50 dark:border-slate-600">{loading ? copy.loading : copy.refresh}</button></div>
        {message && <p role="status" className="rounded-xl bg-orange-50 p-4 text-sm text-slate-800 dark:bg-slate-800 dark:text-white">{message}</p>}
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
            <section className="min-w-0 space-y-2 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                {list.reports.length === 0 && !loading && <p className="p-3 text-sm text-slate-500">{copy.empty}</p>}
                {list.reports.map(report => <button key={report.id} type="button" disabled={saving} onClick={() => void select(report.id)} className={`block w-full break-words rounded-xl border p-3 text-left text-sm disabled:opacity-50 ${detail?.id === report.id ? "border-orange-400 bg-orange-50 dark:bg-orange-950/30" : "border-slate-200 dark:border-slate-700"}`}><strong>#{report.id} · {copy.reasons[report.reason]}</strong><span className="mt-1 block">{copy.statuses[report.status]} · {format(report.createdAt)}</span></button>)}
                {list.hasNext && <button type="button" disabled={loading || saving} onClick={() => void loadList(list.nextCursorId)} className="min-h-12 w-full rounded-xl border border-slate-300 p-3 text-sm font-bold disabled:opacity-50 dark:border-slate-600">{copy.more}</button>}
            </section>
            <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                {!detail ? <p>{copy.select}</p> : <>
                    <div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-black">#{detail.id} · {copy.reasons[detail.reason]}</h2><button type="button" disabled={saving} onClick={() => void select(detail.id)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600">{copy.refresh}</button></div>
                    <p className="mt-2 text-sm text-slate-500">{copy.statuses[detail.status]} · {format(detail.createdAt)}</p>
                    <p className="mt-4 whitespace-pre-wrap break-words text-sm">{detail.detail}</p>
                    <Evidence key={`${detail.id}:${detail.version}`} detail={detail} copy={copy} />
                    <div className="mt-5 space-y-4 border-t border-slate-200 pt-5 dark:border-slate-700">
                        <label className="block text-sm font-bold">{copy.review}<select value={status} disabled={saving || reloadRequired} onChange={event => { setStatus(event.target.value as ReportStatus); setConfirmed(false); }} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">{REPORT_STATUSES.map(value => <option key={value} value={value}>{copy.statuses[value]}</option>)}</select></label>
                        <textarea aria-label={copy.review} maxLength={2000} rows={4} value={note} disabled={saving || reloadRequired} onChange={event => { setNote(event.target.value); setConfirmed(false); }} className="w-full rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-600 dark:bg-slate-800" />
                        <label className="flex gap-3 text-sm"><input type="checkbox" checked={confirmed} disabled={saving || reloadRequired} onChange={event => setConfirmed(event.target.checked)} className="size-5 shrink-0" />{copy.confirm}</label>
                        <button type="button" disabled={!confirmed || saving || reloadRequired} onClick={() => void review()} className="min-h-12 w-full rounded-2xl bg-orange-500 px-4 py-3 font-bold text-white disabled:opacity-50">{saving ? copy.sending : copy.save}</button>
                    </div>
                </>}
            </section>
        </div>
    </div>;
}

function Evidence({ detail, copy }: { detail: ReportDetail; copy: ReturnType<typeof reportCopy> }) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const remaining = Date.parse(detail.evidenceExpiresAt) - Date.now();
        if (remaining <= 0) return;
        const timer = setTimeout(() => setNow(Date.now()), Math.min(remaining + 10, 2147483647));
        return () => clearTimeout(timer);
    }, [detail.evidenceExpiresAt, now]);
    const expired = detail.evidenceExpired || Date.parse(detail.evidenceExpiresAt) <= now;
    return <div className="mt-4 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800"><h3 className="text-sm font-bold">{copy.evidence}</h3>{expired ? <p className="mt-2 text-sm">{copy.expired}</p> : <><p className="mt-2 break-words text-sm font-bold">{detail.evidenceSenderDisplay}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{detail.evidenceContent}</p></>}</div>;
}
