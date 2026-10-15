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
import { languageLearningSettingService } from "@/services/language-learning/languageLearningSettingService";
import { languageLearningKeywordService } from "@/services/language-learning/languageLearningKeywordService";
import { createWebAiLearningService } from "@/services/language-learning/webAiLearningService";
import { toWebAiPlanRequest } from "@/features/language-learning/web-ai/webAiApi";
import { markWebAiDraftImported, readImportedWebAiDraftIds } from "@/features/language-learning/web-ai/webAiScheduleStorage";
import type { WebAiPlan } from "@/types/language-learning/webAi";
import { getApiErrorCode } from "@/services/common/responseParser";

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

    const [defaults, setDefaults] = useState(FALLBACK_DEFAULTS);
    const [baseStatus, setBaseStatus] = useState<"loading" | "ready" | "error">("loading");
    const [baseRevision, setBaseRevision] = useState(0);
    const [keywordRevision, setKeywordRevision] = useState(0);
    const [keywordStatus, setKeywordStatus] = useState<"loading" | "ready" | "error">("loading");
    const [defaultKeywordStatus, setDefaultKeywordStatus] = useState<"loading" | "ready" | "error">("loading");
    const [keywordCatalog, setKeywordCatalog] = useState<WebAiPlanKeyword[]>([]);
    const [defaultKeywords, setDefaultKeywords] = useState<WebAiPlanKeyword[]>([]);
    const [schedules, setSchedules] = useState<WebAiPlan[]>([]);
    const [browserDrafts, setBrowserDrafts] = useState<WebAiSchedule[]>([]);
    const [planStatus, setPlanStatus] = useState<"loading" | "ready" | "error">("loading");
    const [planRevision, setPlanRevision] = useState(0);
    const [busy, setBusy] = useState(false);
    const [workflowNotice, setWorkflowNotice] = useState<string | null>(null);
    const [draft, setDraft] = useState<WebAiSchedule | null>(null);
    const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
    const [issues, setIssues] = useState<string[]>([]);
    const [notice, setNotice] = useState<"saved" | "saveFailed" | "copied" | "copyFailed" | null>(null);
    const activeDraftId = draft?.id;
    const currentOwner = useRef(owner);
    const copyExecution = useRef<{ planId: string; revision: number; key: string } | null>(null);

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
            setDefaults(FALLBACK_DEFAULTS);
            setBaseStatus("loading");
            setKeywordStatus("loading");
            setDefaultKeywordStatus("loading");
            setKeywordCatalog([]);
            setDefaultKeywords([]);
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

    // 점수 집계 언어와 어긋나지 않게 현재 유효한 기본 언어 설정만 참조한다.
    useEffect(() => {
        if (!owner) return;
        let cancelled = false;

        void languageLearningSettingService.get().then((setting) => {
            if (cancelled) return;
            if (!setting.configured || !setting.originLanguage || !setting.learningLanguage) {
                setBaseStatus("error");
                return;
            }
            setDefaults({
                originLanguage: setting.originLanguage,
                learningLanguage: setting.learningLanguage,
                feedbackLanguage: setting.feedbackLanguage ?? setting.originLanguage,
                timezone: setting.pendingTimezone ?? setting.timezone ?? "Asia/Tokyo",
            });
            setBaseStatus("ready");
        }).catch(() => {
            if (!cancelled) setBaseStatus("error");
        });

        return () => {
            cancelled = true;
        };
    }, [owner, baseRevision]);

    // 조회만 수행하며 계획별 선택이 사용자 공통 키워드 설정을 변경하지 않게 한다.
    useEffect(() => {
        if (!owner) return;
        let cancelled = false;
        void Promise.allSettled([
            languageLearningKeywordService.getAll(locale),
            languageLearningKeywordService.getEffective(),
        ]).then(([catalogResult, effectiveResult]) => {
            if (cancelled) return;
            if (catalogResult.status === "fulfilled") {
                const result = catalogResult.value;
                const active = [...result.systemKeywords, ...result.customKeywords].filter((keyword) => keyword.active);
                setKeywordCatalog(active.map((keyword) => ({
                    key: `${keyword.source}:${keyword.id}`,
                    text: keyword.text,
                    canonicalKey: keyword.canonicalKey || null,
                })));
                setKeywordStatus("ready");
            } else {
                setKeywordStatus("error");
            }

            // 예약 변경이 노출되는 편집 목록 대신 오늘 유효한 목록을 기본 출제에 사용한다.
            if (effectiveResult.status === "fulfilled") {
                setDefaultKeywords(effectiveResult.value.candidates.map((keyword) => ({ ...keyword })));
                setDefaultKeywordStatus("ready");
            } else {
                setDefaultKeywordStatus("error");
            }
        });
        return () => {
            cancelled = true;
        };
    }, [owner, locale, keywordRevision]);

    // 다른 탭에서 공통 설정을 바꾼 뒤 돌아오면 언어와 키워드를 다시 확인한다.
    useEffect(() => {
        if (!owner) return;
        const refreshSettings = () => {
            setBaseStatus("loading");
            setBaseRevision((value) => value + 1);
            setKeywordStatus("loading");
            setDefaultKeywordStatus("loading");
            setKeywordRevision((value) => value + 1);
        };
        window.addEventListener("focus", refreshSettings);
        return () => window.removeEventListener("focus", refreshSettings);
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
    const prompt = effectiveDraft && baseStatus === "ready" &&
        (effectiveDraft.keywordMode === "CUSTOM" || defaultKeywordStatus === "ready") && currentIssues.length === 0
        ? buildWebAiPrompt(
              effectiveDraft,
              locale === "ja" || locale === "learning" ? locale : "ko",
              areaLabels,
              defaultKeywords,
          )
        : "";

    const startNew = () => {
        if (busy) return;
        setDraft(createWebAiSchedule(defaults));
        setIssues([]);
        setNotice(null);
    };

    const retryBaseSettings = () => {
        setBaseStatus("loading");
        setBaseRevision((value) => value + 1);
    };

    const retryKeywords = () => {
        setKeywordStatus("loading");
        setDefaultKeywordStatus("loading");
        setKeywordRevision((value) => value + 1);
    };

    const startEdit = (schedule: WebAiSchedule) => {
        if (busy) return;
        setDraft(cloneSchedule(schedule));
        setIssues([]);
        setNotice(null);
    };

    const closeDraft = () => {
        if (busy) return;
        setDraft(null);
        setIssues([]);
        setNotice(null);
    };

    const duplicate = (schedule: WebAiSchedule) => {
        if (busy) return;
        const copy = cloneSchedule(schedule);
        copy.id = createWebAiSchedule(defaults).id;
        copy.name = t("copyName", { name: schedule.name });
        setDraft(copy);
        setIssues([]);
        setNotice(null);
    };

    const save = async () => {
        if (!owner || !effectiveDraft || busy) return;

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
            if (code === "WEB_AI_CONFLICT") setPlanRevision((value) => value + 1);
        } finally {
            if (currentOwner.current === owner) setBusy(false);
        }
    };

    const remove = async (schedule: WebAiSchedule) => {
        if (!owner || busy || !window.confirm(t("confirmDelete", { name: schedule.name }))) return;
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
        } catch {
            if (currentOwner.current === owner) setWorkflowNotice("actionFailed");
        } finally {
            if (currentOwner.current === owner) setBusy(false);
        }
    };

    const importDrafts = async () => {
        if (!owner || busy) return;
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
        } catch {
            if (currentOwner.current === owner) setWorkflowNotice("actionFailed");
        } finally {
            if (currentOwner.current === owner) setBusy(false);
        }
    };

    const togglePlan = async (plan: WebAiPlan) => {
        if (busy) return;
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
        if (!draftSaved || !serverDraft || busy) {
            setIssues(currentIssues);
            return;
        }

        try {
            // 실제 실행에는 저장된 계획의 서버 스냅샷과 결과 계약이 포함된 프롬프트만 복사한다.
            if (copyExecution.current?.planId !== serverDraft.id || copyExecution.current.revision !== serverDraft.revision) {
                copyExecution.current = { planId: serverDraft.id, revision: serverDraft.revision, key: crypto.randomUUID() };
            }
            const run = await api.createRun(serverDraft.id, copyExecution.current.key);
            if (currentOwner.current !== owner) return;
            await navigator.clipboard.writeText(run.prompt);
            copyExecution.current = null;
            setNotice("copied");
        } catch {
            setNotice("copyFailed");
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
                            <button type="button" onClick={startNew} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-500">
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

                {owner && planStatus === "loading" && <p role="status" className="text-sm text-slate-500 dark:text-slate-300">{workflow("loadingPlans")}</p>}
                {owner && planStatus === "error" && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200"><p>{workflow("loadFailed")}</p><button type="button" onClick={() => { setPlanStatus("loading"); setPlanRevision((value) => value + 1); }} className="font-black underline">{workflow("retry")}</button></div>}
                {pendingDrafts.length > 0 && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200"><p>{workflow("importDraftsHelp")}</p>{pendingDrafts.length > importableDrafts.length && <p className="mt-1">{workflow("draftsNeedReview")}</p>}<button type="button" disabled={busy || baseStatus !== "ready" || planStatus !== "ready" || importableDrafts.length === 0} onClick={() => void importDrafts()} className="mt-2 min-h-9 font-black underline disabled:opacity-50">{workflow("importDrafts", { count: importableDrafts.length })}</button></div>}
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
                                <button
                                    type="button"
                                    onClick={startNew}
                                    className="hidden min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-500 xl:inline-flex"
                                >
                                    <Plus className="h-4 w-4" aria-hidden="true" />
                                    {t("newPlan")}
                                </button>
                            </div>

                            {visibleSchedules.length === 0 ? (
                                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/35">
                                    <CalendarDays className="mx-auto h-7 w-7 text-blue-500" aria-hidden="true" />
                                    <p className="mt-3 font-black text-slate-900 dark:text-white">{t("emptyTitle")}</p>
                                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{t("emptyDescription")}</p>
                                </div>
                            ) : (
                                <div className="mt-5 space-y-3">
                                    {visibleSchedules.map((schedule) => (
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
                                                    {schedules.some((plan) => plan.id === schedule.id) && <button type="button" disabled={busy} aria-pressed={schedules.find((plan) => plan.id === schedule.id)!.enabled} onClick={() => void togglePlan(schedules.find((plan) => plan.id === schedule.id)!)} className="mt-2 min-h-8 rounded-full border border-blue-200 px-2.5 text-xs font-black text-blue-700 disabled:opacity-50 dark:border-blue-400/20 dark:text-blue-200">{workflow(schedules.find((plan) => plan.id === schedule.id)!.enabled ? "enabled" : "disabled")}</button>}
                                                </div>
                                                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                                                    {t("questionCount", { count: totalQuestions(schedule) })}
                                                </span>
                                            </div>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <button type="button" onClick={() => startEdit(schedule)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:border-blue-300 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
                                                    <FilePenLine className="h-3.5 w-3.5" aria-hidden="true" />{t("edit")}
                                                </button>
                                                <button type="button" onClick={() => duplicate(schedule)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:border-blue-300 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
                                                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />{t("duplicate")}
                                                </button>
                                                <button type="button" disabled={busy} onClick={() => void remove(schedule)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-black text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-400/20 dark:bg-slate-900 dark:text-rose-300">
                                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />{t("delete")}
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </aside>

                        {draft ? (
                            <div className="min-w-0">
                                <WebAiScheduleEditor
                                    key={draft.id}
                                    schedule={effectiveDraft!}
                                    baseStatus={baseStatus}
                                    onRetryBase={retryBaseSettings}
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
                                    prompt={prompt}
                                    questionCount={selectedCount}
                                    busy={busy}
                                    canCopy={draftSaved}
                                    integration={<WebAiPlanIntegration key={`${draft.id}:${serverDraft?.revision ?? "new"}`} planId={draft.id} saved={draftSaved} />}
                                />
                            </div>
                        ) : (
                            <div className="hidden min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center dark:border-slate-700 dark:bg-slate-900/60 xl:flex">
                                <FilePenLine className="h-10 w-10 text-blue-500" aria-hidden="true" />
                                <h2 className="mt-4 text-lg font-black text-slate-950 dark:text-white">{t("selectTitle")}</h2>
                                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{t("selectDescription")}</p>
                                <button type="button" onClick={startNew} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-500">
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
