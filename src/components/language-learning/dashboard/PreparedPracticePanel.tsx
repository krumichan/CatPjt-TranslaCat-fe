"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import { createIdempotencyKey } from "@/features/language-learning/listening/idempotency";
import { useQuery } from "@/hooks/useQuery";
import { Link, useRouter } from "@/navigation";
import { autoPracticeService, type PreparedPractice } from "@/services/language-learning/autoPracticeService";
import { listeningService } from "@/services/language-learning/listeningService";
import type { ListeningLearningMode, ListeningTaskType } from "@/types/language-learning/listening";

const tasksByMode: Record<ListeningLearningMode, ListeningTaskType[]> = {
    DICTATION: ["DICTATION", "INTERPRETATION"],
    COMPREHENSION: ["COMPREHENSION"],
    SUMMARY: ["SUMMARY"],
};
const preparing = new Set(["PENDING", "CLAIMED", "QUEUED", "GENERATING"]);
const playable = new Set(["READY", "PARTIAL"]);
const actionClass = "rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600";

/** サーバーから保存済み問題だけを読み、準備済みセットを既存の学習画面につなぐ。 */
export function PreparedPracticePanel() {
    const t = useTranslations("LanguageLearning.autoPractice");
    const labels = useTranslations("LanguageLearning.settings.webAi");
    const owner = useSession().data?.user?.publicId;
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState(false);
    const start = useRef<{ setId: number; key: string } | null>(null);
    const query = useQuery({
        keys: owner ? ["auto-practice-workspace", owner] as const : null,
        fetcher: autoPracticeService.workspace,
        config: {
            shouldRetryOnError: false,
            revalidateOnMount: true,
            refreshInterval: (data) => data?.jobs.some((job) => preparing.has(job.state))
                ? 15_000 : data?.plans.some((plan) => plan.enabled) ? 60_000 : 0,
        },
    });
    const jobs = query.data?.jobs.filter((job) => job.state !== "COMPLETED") ?? [];
    if (!jobs.length && !query.data?.plans.some((plan) => plan.enabled)) return null;

    /** 音源まで準備済みのセットだけを使い、同じ開始操作を安全に再送できるようにする。 */
    async function openListening(job: PreparedPractice) {
        const setId = Number(job.resourceId);
        if (pending || !Number.isSafeInteger(setId) || setId <= 0) return;
        setPending(true);
        setError(false);
        try {
            const set = await listeningService.getDailySet(setId);
            if (set.readyItemCount < 1) throw new Error("Listening set is unavailable.");
            if (start.current?.setId !== setId) {
                start.current = { setId, key: createIdempotencyKey("prepared-listening") };
            }
            const session = await listeningService.createSession({
                dailySetId: setId,
                selectedTaskTypes: tasksByMode[set.learningMode],
                idempotencyKey: start.current.key,
            });
            router.push(`/language-learning/listening/session/${session.sessionId}`);
        } catch {
            setPending(false);
            setError(true);
        }
    }

    return (
        <section className="space-y-3 rounded-2xl border border-slate-200 p-5 dark:border-slate-700" data-testid="prepared-practice">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold">{t("preparedTitle")}</h2>
                <Link className={actionClass} href="/language-learning/settings#automatic-practice">{t("title")}</Link>
            </div>
            {error && <p role="alert" className="text-sm text-rose-600">{t("error")}</p>}
            {jobs.length === 0 && <p className="text-sm text-slate-500">{t("empty")}</p>}
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {jobs.map((job) => {
                    const canPlay = playable.has(job.state) && job.resourceId != null;
                    const writingType = job.area.replace("WRITING_", "");
                    return (
                        <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                            <div>
                                <p className="font-semibold">{labels(`areas.${job.area}`)}</p>
                                <p className="text-sm text-slate-500">
                                    {job.learningDate} · {preparing.has(job.state)
                                        ? t("preparing") : canPlay ? t("ready") : t("unavailable")}
                                </p>
                            </div>
                            {canPlay && job.area.startsWith("WRITING_") && <Link className={actionClass}
                                href={`/language-learning/writing?preparedDate=${job.learningDate}&preparedType=${writingType}`}>
                                {t("open")}
                            </Link>}
                            {canPlay && job.area.startsWith("READING_") && <Link className={actionClass}
                                href={`/language-learning/reading/session/${job.resourceId}`}>
                                {t("open")}
                            </Link>}
                            {canPlay && job.area.startsWith("LISTENING_") && <button type="button"
                                className={actionClass} disabled={pending} onClick={() => void openListening(job)}>
                                {t("open")}
                            </button>}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
