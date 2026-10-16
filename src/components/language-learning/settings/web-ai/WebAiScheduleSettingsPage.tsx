"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowLeft,
    BookOpen,
    CalendarDays,
    Copy,
    FilePenLine,
    House,
    Plus,
    Settings,
    Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";

import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { WebAiScheduleEditor } from "@/components/language-learning/settings/web-ai/WebAiScheduleEditor";
import { WebAiPlanIntegration } from "@/components/language-learning/settings/web-ai/WebAiPlanIntegration";
import { WebAiPlanCopyButton } from "@/components/language-learning/settings/web-ai/WebAiPlanCopyButton";
import { WebAiPlanPrerequisiteChecklist } from "@/components/language-learning/settings/web-ai/WebAiPlanPrerequisiteChecklist";
import { useWebAiPlanPrerequisites } from "@/hooks/language-learning/useWebAiPlanPrerequisites";
import { useWebAiPlanTransfer, useWebAiPlanTransferStore } from "@/hooks/language-learning/useWebAiPlanTransfer";
import {
    WEB_AI_AREA_GROUPS,
    applyWebAiLanguageSettings,
    buildWebAiPrompt,
    createWebAiSchedule,
    readWebAiSchedules,
    validateWebAiSchedule,
    writeWebAiSchedules,
} from "@/features/language-learning/web-ai";
import type { WebAiAreaCode, WebAiSchedule, WebAiPlanKeyword } from "@/features/language-learning/web-ai";
import { Link } from "@/navigation";
import { languageLearningKeywordService } from "@/services/language-learning/languageLearningKeywordService";
import { createWebAiLearningService } from "@/services/language-learning/webAiLearningService";
import { toWebAiPlanRequest } from "@/features/language-learning/web-ai/webAiApi";
import { markWebAiDraftImported, readImportedWebAiDraftIds } from "@/features/language-learning/web-ai/webAiScheduleStorage";
import type { WebAiPlan } from "@/types/language-learning/webAi";
import { getApiErrorCode } from "@/services/common/responseParser";
import { LANGUAGE_LEARNING_SETUP_UPDATED } from "@/features/language-learning/web-ai/webAiPrerequisites";

const FALLBACK_DEFAULTS = {
    originLanguage: "ko",
    learningLanguage: "ja",
    feedbackLanguage: "ko",
    timezone: "Asia/Tokyo",
};

function totalQuestions(schedule: WebAiSchedule) {
    return schedule.areas.reduce(
        (sum, area) => sum + area.easy + area.standard + area.hard,
        0,
    );
}

function cloneSchedule(schedule: WebAiSchedule): WebAiSchedule {
    return {
        ...schedule,
        weekdays: [...schedule.weekdays],
        monthDays: [...schedule.monthDays],
        areas: schedule.areas.map((area) => ({ ...area })),
        keywords: schedule.keywords.map((keyword) => ({ ...keyword })),
    };
}

export function WebAiScheduleSettingsPage() {
    const t = useTranslations("LanguageLearning.settings.webAi");
    const workflow = useTranslations("LanguageLearning.webAiWorkflow");
    const locale = useLocale();
    const { data: session, status } = useSession();
    const owner = session?.user?.publicId ?? null;
    const api = useMemo(() => createWebAiLearningService(session?.loginSessionId), [session?.loginSessionId]);
    const prerequisites = useWebAiPlanPrerequisites();

    const [keywordRevision, setKeywordRevision] = useState(0);
    const [keywordStatus, setKeywordStatus] = useState<"loading" | "ready" | "error">("loading");
    const [keywordCatalog, setKeywordCatalog] = useState<WebAiPlanKeyword[]>([]);
    const [schedules, setSchedules] = useState<WebAiPlan[]>([]);
    const [browserDrafts, setBrowserDrafts] = useState<WebAiSchedule[]>([]);
    const [planStatus, setPlanStatus] = useState<"loading" | "ready" | "error">("loading");
    const [planRevision, setPlanRevision] = useState(0);
    const [busy, setBusy] = useState(false);
    const [workflowNotice, setWorkflowNotice] = useState<string | null>(null);
    const [draft, setDraft] = useState<WebAiSchedule | null>(null);
    const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
    const [issues, setIssues] = useState<string[]>([]);
    const [notice, setNotice] = useState<"saved" | "saveFailed" | "copied" | "copyFailed" | "prepareFailed" | null>(null);
    const activeDraftId = draft?.id;
    const currentOwner = useRef(owner);
    const copying = useRef(false);
    const baseStatus = prerequisites.settingsStatus === "complete" ? "ready" : prerequisites.settingsStatus === "loading" ? "loading" : "error";
    const defaultKeywordStatus = prerequisites.keywordsStatus === "error" ? "error" : prerequisites.keywordsStatus === "loading" ? "loading" : "ready";
    const setting = prerequisites.setting;
    const defaults = setting ? {
        originLanguage: setting.originLanguage ?? FALLBACK_DEFAULTS.originLanguage,
        learningLanguage: setting.learningLanguage ?? FALLBACK_DEFAULTS.learningLanguage,
        feedbackLanguage: setting.feedbackLanguage ?? setting.originLanguage ?? FALLBACK_DEFAULTS.feedbackLanguage,
        timezone: setting.pendingTimezone ?? setting.timezone ?? FALLBACK_DEFAULTS.timezone,
    } : FALLBACK_DEFAULTS;
    const defaultKeywords = prerequisites.keywords?.candidates ?? [];

    // 브라우저 초안은 로그인 계정별로 읽으며, 다른 계정의 편집 상태를 이어받지 않는다.
    useEffect(() => {
        let cancelled = false;
        currentOwner.current = owner;
        const imported = owner ? new Set(readImportedWebAiDraftIds(owner)) : new Set<string>();
        const saved = owner ? readWebAiSchedules(owner).filter((plan) => !imported.has(plan.id)) : [];

        queueMicrotask(() => {
            if (cancelled) return;
            setSchedules([]);
            setBrowserDrafts(saved);
            setPlanStatus("loading");
            setBusy(false);
            setWorkflowNotice(null);
            setDraft(null);
            setIssues([]);
            setNotice(null);
            setKeywordStatus("loading");
            setKeywordCatalog([]);
            setLoadedOwner(owner);
        });

        return () => {
            cancelled = true;
        };
    }, [owner]);

    // 계획 목록은 서버를 기준으로 읽는다. 실패 시 브라우저 초안을 덮어쓰지 않는다.
    useEffect(() => {
        if (!owner) return;
        let cancelled = false;
        void api.listPlans().then(({ plans }) => {
            if (cancelled) return;
            setSchedules(plans);
            setPlanStatus("ready");
        }).catch(() => {
            if (!cancelled) setPlanStatus("error");
        });
        return () => { cancelled = true; };
    }, [owner, planRevision, api]);

    // 조회만 수행하며 계획별 선택이 사용자 공통 키워드 설정을 변경하지 않게 한다.
    useEffect(() => {
        if (!owner) return;
        let cancelled = false;
        void languageLearningKeywordService.getAll(locale).then((result) => {
            if (cancelled) return;
            const active = [...result.systemKeywords, ...result.customKeywords].filter((keyword) => keyword.active);
            setKeywordCatalog(active.map((keyword) => ({
                key: `${keyword.source}:${keyword.id}`,
                text: keyword.text,
                canonicalKey: keyword.canonicalKey || null,
            })));
            setKeywordStatus("ready");
        }).catch(() => { if (!cancelled) setKeywordStatus("error"); });
        return () => {
            cancelled = true;
        };
    }, [owner, locale, keywordRevision]);

    // 공통 설정의 준비 상태는 공유 훅이 확인하고, 편집용 카탈로그도 함께 갱신한다.
    useEffect(() => {
        if (!owner) return;
        const refreshSettings = () => {
            setKeywordRevision((value) => value + 1);
        };
        window.addEventListener("focus", refreshSettings);
        window.addEventListener(LANGUAGE_LEARNING_SETUP_UPDATED, refreshSettings);
        return () => {
            window.removeEventListener("focus", refreshSettings);
            window.removeEventListener(LANGUAGE_LEARNING_SETUP_UPDATED, refreshSettings);
        };
    }, [owner]);

    // 모바일 목록과 편집기는 별도 상태다. 전환 시 AppShell 내부 스크롤을 맨 위로 돌린다.
    useEffect(() => {
        if (!window.matchMedia("(max-width: 1279px)").matches) return;

        const frame = window.requestAnimationFrame(() => {
            const scroller = document.querySelector<HTMLElement>("main.overflow-y-auto");
            if (scroller) scroller.scrollTop = 0;
        });
        return () => window.cancelAnimationFrame(frame);
    }, [activeDraftId]);

    const areaLabels = useMemo(() => {
        const entries = WEB_AI_AREA_GROUPS.flatMap((group) =>
            group.areas.map((code) => [code, t(`areas.${code}`)] as const),
        );
        return Object.fromEntries(entries) as Record<WebAiAreaCode, string>;
    }, [t]);

    const effectiveDraft = draft && baseStatus === "ready" ? applyWebAiLanguageSettings(draft, defaults) : draft;
    const serverDraft = schedules.find((plan) => plan.id === draft?.id);
    const pendingDrafts = browserDrafts.filter((plan) => !schedules.some((saved) => saved.id === plan.id));
    const importableDrafts = pendingDrafts.filter((plan) => validateWebAiSchedule(applyWebAiLanguageSettings(plan, defaults)).length === 0);
    const visibleSchedules: WebAiSchedule[] = [...schedules, ...pendingDrafts];
    const draftSaved = Boolean(serverDraft && effectiveDraft &&
        JSON.stringify(toWebAiPlanRequest(effectiveDraft, serverDraft.enabled)) ===
        JSON.stringify(toWebAiPlanRequest(serverDraft, serverDraft.enabled)));
    const selectedCount = effectiveDraft ? totalQuestions(effectiveDraft) : 0;
    const currentIssues = effectiveDraft ? validateWebAiSchedule(effectiveDraft) : [];
    // 목록과 편집기는 계획별 연결 키·회차를 공유한다. 문맥 변경 시 수동 회차만 다시 준비한다.
    const transferStore = useWebAiPlanTransferStore(owner ? `${owner}:${session?.loginSessionId ?? ""}` : null);
    const transferContextKey = (plan?: WebAiPlan) => JSON.stringify([
        plan?.revision,
        setting?.originLanguage,
        setting?.learningLanguage,
        setting?.feedbackLanguage,
        defaultKeywords,
        plan ? new Intl.DateTimeFormat("en-CA", { timeZone: plan.timezone }).format(new Date()) : null,
    ]);
    const transfer = useWebAiPlanTransfer({
        store: transferStore,
        plan: serverDraft,
        contextKey: transferContextKey(serverDraft),
        locale: locale === "ja" || locale === "learning" ? locale : "ko",
        api,
    });
    const working = busy || transfer.busy;
    const promptSummary = effectiveDraft && prerequisites.ready &&
        (effectiveDraft.keywordMode === "CUSTOM" || defaultKeywordStatus === "ready") && currentIssues.length === 0
        ? buildWebAiPrompt(
              effectiveDraft,
              locale === "ja" || locale === "learning" ? locale : "ko",
              areaLabels,
              defaultKeywords,
          )
        : "";

    const startNew = () => {
        if (working || !prerequisites.ready) return;
        setDraft(createWebAiSchedule(defaults));
        setIssues([]);
        setNotice(null);
    };

    const retryKeywords = () => {
        setKeywordStatus("loading");
        prerequisites.refresh();
        setKeywordRevision((value) => value + 1);
    };

    const startEdit = (schedule: WebAiSchedule) => {
        if (working) return;
        setDraft(cloneSchedule(schedule));
        setIssues([]);
        setNotice(null);
    };

    const closeDraft = () => {
        if (working) return;
        setDraft(null);
        setIssues([]);
        setNotice(null);
    };

    const duplicate = (schedule: WebAiSchedule) => {
        if (working || !prerequisites.ready) return;
        const copy = cloneSchedule(schedule);
        copy.id = createWebAiSchedule(defaults).id;
        copy.name = t("copyName", { name: schedule.name });
        setDraft(copy);
        setIssues([]);
        setNotice(null);
    };

    const save = async () => {
        if (!owner || !effectiveDraft || working || !prerequisites.ready) return;

        // 유효한 계획만 서버에 저장하고 응답의 revision을 다음 수정에 사용한다.
        const nextIssues = validateWebAiSchedule(effectiveDraft);
        setIssues(nextIssues);
        setNotice(null);
        if (nextIssues.length > 0) return;

        setBusy(true);
        setWorkflowNotice(null);
        try {
            const saved = serverDraft
                ? await api.updatePlan(effectiveDraft.id, toWebAiPlanRequest(effectiveDraft, serverDraft.enabled, serverDraft.revision))
                : await api.createPlan(toWebAiPlanRequest(effectiveDraft));
            if (currentOwner.current !== owner) return;
            setSchedules((current) => [saved, ...current.filter((plan) => plan.id !== saved.id)]);
            setDraft(cloneSchedule(saved));
            markWebAiDraftImported(owner, effectiveDraft.id);
            setBrowserDrafts((current) => current.filter((plan) => plan.id !== effectiveDraft.id));
            setNotice("saved");
        } catch (error) {
            if (currentOwner.current !== owner) return;
            setNotice("saveFailed");
            const code = getApiErrorCode(error);
            if (code && workflow.has(`error.${code}`)) setWorkflowNotice(`error.${code}`);
            if (code === "WEB_AI_SETTINGS_REQUIRED" || code === "WEB_AI_KEYWORDS_REQUIRED") prerequisites.refresh();
            if (code === "WEB_AI_CONFLICT") setPlanRevision((value) => value + 1);
        } finally {
            if (currentOwner.current === owner) setBusy(false);
        }
    };

    const remove = async (schedule: WebAiSchedule) => {
        if (!owner || working || !window.confirm(t("confirmDelete", { name: schedule.name }))) return;
        setBusy(true);
        try {
            if (schedules.some((plan) => plan.id === schedule.id)) {
                await api.deletePlan(schedule.id);
                if (currentOwner.current !== owner) return;
                setSchedules((current) => current.filter((plan) => plan.id !== schedule.id));
            } else {
                const remaining = readWebAiSchedules(owner).filter((plan) => plan.id !== schedule.id);
                if (!writeWebAiSchedules(owner, remaining)) throw new Error("DRAFT_DELETE_FAILED");
            }
            setBrowserDrafts((current) => current.filter((plan) => plan.id !== schedule.id));
            if (draft?.id === schedule.id) setDraft(null);
            setNotice(null);
        } catch (error) {
            if (currentOwner.current === owner) {
                const code = getApiErrorCode(error);
                setWorkflowNotice(code && workflow.has(`error.${code}`) ? `error.${code}` : "actionFailed");
                if (code === "WEB_AI_SETTINGS_REQUIRED" || code === "WEB_AI_KEYWORDS_REQUIRED") prerequisites.refresh();
            }
        } finally {
            if (currentOwner.current === owner) setBusy(false);
        }
    };

    const importDrafts = async () => {
        if (!owner || working || !prerequisites.ready) return;
        setBusy(true);
        setWorkflowNotice(null);
        try {
            // 한 건씩 확정한다. 중간 실패 때 성공한 계획과 남은 원본 초안을 모두 보존한다.
            for (const local of importableDrafts) {
                const plan = applyWebAiLanguageSettings(local, defaults);
                const saved = await api.createPlan(toWebAiPlanRequest(plan));
                if (currentOwner.current !== owner) return;
                markWebAiDraftImported(owner, local.id);
                setSchedules((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
                setBrowserDrafts((current) => current.filter((item) => item.id !== local.id));
            }
            setWorkflowNotice("draftsImported");
        } catch (error) {
            if (currentOwner.current === owner) {
                const code = getApiErrorCode(error);
                setWorkflowNotice(code && workflow.has(`error.${code}`) ? `error.${code}` : "actionFailed");
                if (code === "WEB_AI_SETTINGS_REQUIRED" || code === "WEB_AI_KEYWORDS_REQUIRED") prerequisites.refresh();
            }
        } finally {
            if (currentOwner.current === owner) setBusy(false);
        }
    };

    const togglePlan = async (plan: WebAiPlan) => {
        if (working || !prerequisites.ready) return;
        setBusy(true);
        setWorkflowNotice(null);
        try {
            const saved = await api.updatePlan(plan.id, toWebAiPlanRequest(plan, !plan.enabled, plan.revision));
            if (currentOwner.current !== owner) return;
            setSchedules((current) => current.map((item) => item.id === saved.id ? saved : item));
        } catch {
            if (currentOwner.current === owner) setWorkflowNotice("actionFailed");
        } finally {
            if (currentOwner.current === owner) setBusy(false);
        }
    };

    const copyPrompt = async () => {
        setNotice(null);
        setWorkflowNotice(null);
        if (!draftSaved || !serverDraft || working || !prerequisites.ready || currentIssues.length > 0) {
            setIssues(currentIssues);
            return;
        }

        if (copying.current || transfer.busy) return;
        copying.current = true;
        setBusy(true);
        let preparedText = transfer.prompt;
        try {
            // 준비된 문구는 클릭 직후 복사한다. 최초 HTTP 요청 후 실패해도 동일한 실제 문구를 남긴다.
            preparedText ||= await transfer.prepare() ?? "";
            if (currentOwner.current !== owner) return;
            if (!preparedText) throw new Error("WEB_AI_PROMPT_NOT_PREPARED");
            await navigator.clipboard.writeText(preparedText);
            setNotice("copied");
        } catch (error) {
            if (currentOwner.current !== owner) return;
            setNotice(preparedText ? "copyFailed" : "prepareFailed");
            const code = getApiErrorCode(error);
            if (code && workflow.has(`error.${code}`)) setWorkflowNotice(`error.${code}`);
            else if (!preparedText) setWorkflowNotice("actionFailed");
            if (code === "WEB_AI_SETTINGS_REQUIRED" || code === "WEB_AI_KEYWORDS_REQUIRED") prerequisites.refresh();
        } finally {
            copying.current = false;
            if (currentOwner.current === owner) setBusy(false);
        }
    };

    const summarizeRecurrence = (schedule: WebAiSchedule) => {
        if (schedule.recurrence === "DAILY") return t("recurrence.DAILY");
        if (schedule.recurrence === "WEEKLY") {
            return schedule.weekdays
                .slice()
                .sort((a, b) => a - b)
                .map((day) => t(`weekday.${day}`))
                .join(" · ") || t("recurrence.WEEKLY");
        }

        const dates = schedule.monthDays.slice().sort((a, b) => a - b).map(String);
        if (schedule.includeLastDay) dates.push(t("lastDayShort"));
        return dates.join(" · ") || t("recurrence.MONTHLY");
    };

    const summarizeAreas = (schedule: WebAiSchedule) => {
        const groups = WEB_AI_AREA_GROUPS
            .map((group) => {
                const codes = new Set<WebAiAreaCode>(group.areas);
                const count = schedule.areas
                    .filter((area) => codes.has(area.code))
                    .reduce((sum, area) => sum + area.easy + area.standard + area.hard, 0);
                return count > 0 ? `${t(`domains.${group.domain}`)} ${count}` : null;
            })
            .filter((value): value is string => value !== null);

        // 이전 버전의 ‘전체’ 문제 수는 세부 유형에 자동으로 합치지 않고 목록에도 표시한다.
        const legacyCount = schedule.areas
            .filter((area) => WEB_AI_AREA_GROUPS.some((group) => group.domain === area.code))
            .reduce((sum, area) => sum + area.easy + area.standard + area.hard, 0);
        if (legacyCount > 0) groups.push(`${t("legacyAreaTitle")} ${legacyCount}`);

        return groups.join(" · ");
    };

    return (
        <LanguageLearningPageLayout
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
            compactOnMobile
        >
            <div className="space-y-5 [--color-blue-500:#3188ff] [--color-blue-600:#1677ff]" data-testid="web-ai-schedule-settings">
                {draft ? (
                    <div className="flex items-center gap-3 xl:hidden" data-testid="web-ai-mobile-editor-header">
                        <button type="button" onClick={closeDraft} aria-label={t("backToPlans")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">
                            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <h1 className="text-xl font-black text-slate-950 dark:text-white">{t("mobileEditorTitle")}</h1>
                    </div>
                ) : (
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/85 xl:hidden" data-testid="web-ai-mobile-list-header">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">{t("eyebrow")}</p>
                        <h1 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{t("mobileListTitle")}</h1>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t("mobileListDescription")}</p>
                        {owner && loadedOwner === owner && (
                            <button type="button" onClick={startNew} disabled={working || !prerequisites.ready} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45">
                                <Plus className="h-5 w-5" aria-hidden="true" />{t("newPlan")}
                            </button>
                        )}
                        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{workflow("serverNotice")}</p>
                    </div>
                )}
                <Link
                    href="/language-learning/settings"
                    className={`${draft ? "hidden xl:inline-flex" : "inline-flex"} min-h-10 items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-600 dark:text-blue-300`}
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {t("back")}
                </Link>

                <div className="hidden rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-950 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100 xl:block">
                    <p className="font-black">{workflow("serverNoticeTitle")}</p>
                    <p className="mt-1 leading-6">{workflow("serverNotice")}</p>
                </div>

                {owner && !prerequisites.ready && <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-400/20 dark:bg-blue-500/10"><WebAiPlanPrerequisiteChecklist prerequisites={prerequisites} /></section>}

                {owner && planStatus === "loading" && <p role="status" className="text-sm text-slate-500 dark:text-slate-300">{workflow("loadingPlans")}</p>}
                {owner && planStatus === "error" && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200"><p>{workflow("loadFailed")}</p><button type="button" onClick={() => { setPlanStatus("loading"); setPlanRevision((value) => value + 1); }} className="font-black underline">{workflow("retry")}</button></div>}
                {pendingDrafts.length > 0 && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200"><p>{workflow("importDraftsHelp")}</p>{pendingDrafts.length > importableDrafts.length && <p className="mt-1">{workflow("draftsNeedReview")}</p>}<button type="button" disabled={working || !prerequisites.ready || planStatus !== "ready" || importableDrafts.length === 0} onClick={() => void importDrafts()} className="mt-2 min-h-9 font-black underline disabled:opacity-50">{workflow("importDrafts", { count: importableDrafts.length })}</button></div>}
                {workflowNotice && <p role="status" className="text-sm text-slate-700 dark:text-slate-200">{workflow(workflowNotice)}</p>}

                {status === "loading" || (owner && loadedOwner !== owner) ? (
                    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
                        {t("loading")}
                    </div>
                ) : !owner ? (
                    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
                        {t("authRequired")}
                    </div>
                ) : (
                    <div className="grid items-start gap-5 xl:grid-cols-[18rem_minmax(0,1fr)] 2xl:grid-cols-[20rem_minmax(0,1fr)]">
                        {/* PC에서는 목록과 편집기를 함께 표시하고, 모바일은 두 화면을 전환한다. */}
                        <aside data-testid="web-ai-schedule-list" className={`${draft ? "hidden xl:block" : ""} rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/85`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">
                                        {t("planListEyebrow")}
                                    </p>
                                    <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                                        {t("planListTitle", { count: visibleSchedules.length })}
                                    </h2>
                                </div>
                            </div>

                            {visibleSchedules.length === 0 ? (
                                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/35">
                                    <CalendarDays className="mx-auto h-7 w-7 text-blue-500" aria-hidden="true" />
                                    <p className="mt-3 font-black text-slate-900 dark:text-white">{t("emptyTitle")}</p>
                                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{t("emptyDescription")}</p>
                                </div>
                            ) : (
                                <div className="mt-5 space-y-3">
                                    {visibleSchedules.map((schedule) => {
                                        const savedPlan = schedules.find((plan) => plan.id === schedule.id);
                                        return (
                                            <article
                                                key={schedule.id}
                                                className={`rounded-2xl border p-4 transition ${draft?.id === schedule.id
                                                    ? "border-blue-400 bg-blue-50/70 dark:border-blue-400/50 dark:bg-blue-500/10"
                                                    : "border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-slate-800/45"}`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <h3 className="truncate font-black text-slate-950 dark:text-white">{schedule.name}</h3>
                                                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                            {summarizeRecurrence(schedule)} · {schedule.time} · {schedule.timezone}
                                                        </p>
                                                        <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">{summarizeAreas(schedule)}</p>
                                                        {savedPlan && <button type="button" disabled={working || !prerequisites.ready} aria-pressed={savedPlan.enabled} onClick={() => void togglePlan(savedPlan)} className="mt-2 min-h-8 rounded-full border border-blue-200 px-2.5 text-xs font-black text-blue-700 disabled:opacity-50 dark:border-blue-400/20 dark:text-blue-200">{workflow(savedPlan.enabled ? "enabled" : "disabled")}</button>}
                                                    </div>
                                                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                                                        {t("questionCount", { count: totalQuestions(schedule) })}
                                                    </span>
                                                </div>
                                                {savedPlan && (
                                                    <div className="mt-4">
                                                        <WebAiPlanCopyButton
                                                            plan={savedPlan}
                                                            store={transferStore}
                                                            contextKey={transferContextKey(savedPlan)}
                                                            locale={locale === "ja" || locale === "learning" ? locale : "ko"}
                                                            api={api}
                                                            disabled={working || !prerequisites.ready || validateWebAiSchedule(applyWebAiLanguageSettings(savedPlan, defaults)).length > 0}
                                                            onPrerequisitesChanged={prerequisites.refresh}
                                                        />
                                                    </div>
                                                )}
                                                <div className="mt-3 flex flex-wrap justify-center gap-2">
                                                    <button type="button" disabled={working} onClick={() => startEdit(schedule)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:border-blue-300 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
                                                        <FilePenLine className="h-3.5 w-3.5" aria-hidden="true" />{t("edit")}
                                                    </button>
                                                    <button type="button" disabled={working || !prerequisites.ready} onClick={() => duplicate(schedule)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:border-blue-300 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
                                                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />{t("duplicate")}
                                                    </button>
                                                    <button type="button" disabled={working} onClick={() => void remove(schedule)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-black text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-400/20 dark:bg-slate-900 dark:text-rose-300">
                                                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />{t("delete")}
                                                    </button>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </aside>

                        {draft ? (
                            <div className="min-w-0">
                                <WebAiScheduleEditor
                                    key={draft.id}
                                    schedule={effectiveDraft!}
                                    baseStatus={baseStatus}
                                    keywordStatus={keywordStatus}
                                    defaultKeywordStatus={defaultKeywordStatus}
                                    keywordCatalog={keywordCatalog}
                                    defaultKeywords={defaultKeywords}
                                    onRetryKeywords={retryKeywords}
                                    onChange={(next) => {
                                        setDraft(next);
                                        setIssues([]);
                                        setNotice(null);
                                    }}
                                    onSave={() => void save()}
                                    onCopy={() => void copyPrompt()}
                                    onClose={closeDraft}
                                    issues={issues}
                                    notice={notice}
                                    prompt={draftSaved ? transfer.prompt : ""}
                                    promptSummary={promptSummary}
                                    questionCount={selectedCount}
                                    busy={working}
                                    ready={prerequisites.ready}
                                    canCopy={prerequisites.ready && draftSaved && currentIssues.length === 0}
                                    integration={<WebAiPlanIntegration key={draft.id} saved={draftSaved} ready={prerequisites.ready && currentIssues.length === 0} transfer={transfer} onCopy={() => void copyPrompt()} onAction={() => { setNotice(null); setWorkflowNotice(null); }} onPrerequisitesChanged={prerequisites.refresh} />}
                                />
                            </div>
                        ) : (
                            <div className="hidden min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center dark:border-slate-700 dark:bg-slate-900/60 xl:flex">
                                <FilePenLine className="h-10 w-10 text-blue-500" aria-hidden="true" />
                                <h2 className="mt-4 text-lg font-black text-slate-950 dark:text-white">{t("selectTitle")}</h2>
                                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{t("selectDescription")}</p>
                                <button type="button" onClick={startNew} disabled={working || !prerequisites.ready} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45">
                                    <Plus className="h-4 w-4" aria-hidden="true" />{t("newPlan")}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {!draft && (
                    <nav aria-label={t("mobileNavigation")} className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-900/95 xl:hidden">
                        <Link href="/" className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                            <House className="h-5 w-5" aria-hidden="true" />{t("mobileNavHome")}
                        </Link>
                        <Link href="/language-learning" className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                            <BookOpen className="h-5 w-5" aria-hidden="true" />{t("mobileNavLearning")}
                        </Link>
                        <span aria-current="page" className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-black text-blue-700 dark:text-blue-300">
                            <CalendarDays className="h-5 w-5" aria-hidden="true" />{t("mobileNavSchedule")}
                        </span>
                        <Link href="/language-learning/settings" className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                            <Settings className="h-5 w-5" aria-hidden="true" />{t("mobileNavSettings")}
                        </Link>
                    </nav>
                )}
            </div>
        </LanguageLearningPageLayout>
    );
}
