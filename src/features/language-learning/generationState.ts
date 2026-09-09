import type { ListeningAttempt, ListeningDailySet, ListeningSession } from "@/types/language-learning/listening";

export function hasCompleteItemCoverage(itemIds: readonly number[], targetCount: number): boolean {
    return Number.isInteger(targetCount) && targetCount > 0 && new Set(itemIds).size >= targetCount;
}

export function isGenerationPending(status: string | null | undefined): boolean {
    return status === "PENDING" || status === "GENERATING";
}

export function hasCompleteSlotCoverage(indices: readonly number[], targetCount: number): boolean {
    if (!Number.isInteger(targetCount) || targetCount <= 0) return false;
    const slots = new Set(indices);
    return Array.from({ length: targetCount }, (_, index) => index + 1).every((index) => slots.has(index));
}

export function hasCompleteListeningCoverage(session: ListeningSession | null | undefined): boolean {
    if (!session) return false;
    const official = session.attempts.filter((attempt) => attempt.evaluationPurpose === "OFFICIAL");
    const target = session.targetItemCount ?? 5;
    if (official.every((attempt) => attempt.itemIndex != null)) {
        return hasCompleteSlotCoverage(official.map((attempt) => attempt.itemIndex!), target);
    }
    // Older cached responses cannot establish logical coverage without the BE count.
    return (session.attachedItemCount ?? 0) >= target && hasCompleteItemCoverage(official.map((attempt) => attempt.itemId), target);
}

export function shouldPollListeningSession(session: ListeningSession | undefined): boolean {
    if (!session || !["READY", "IN_PROGRESS"].includes(session.status)) return false;
    if (hasCompleteListeningCoverage(session)) return false;
    // A late TTS success must still be attached after a later AI slot failed.
    return (session.generationInProgress ?? !session.generationFailureMessage)
        || (session.pendingItemCount ?? 0) > 0
        || session.dailySetStatus === "READY";
}

export function selectListeningAttempt(attempts: ListeningAttempt[], activeAttemptId: number | null, revealedAttemptId?: number): ListeningAttempt | null {
    const editable = (attempt: ListeningAttempt) => attempt.status === "READY" || attempt.status === "IN_PROGRESS";
    const active = attempts.find((attempt) => attempt.attemptId === activeAttemptId);
    if (active && (editable(active) || active.attemptId === revealedAttemptId)) return active;
    return attempts.find(editable) ?? null;
}

export function listeningPreparationRetryTargets(set: ListeningDailySet) {
    const active = set.items.filter((item) => item.status !== "REPLACED");
    const byIndex = new Map<number, (typeof active)[number]>();
    for (const item of active) {
        const previous = byIndex.get(item.itemIndex);
        if (!previous || previous.replacementSequence < item.replacementSequence) byIndex.set(item.itemIndex, item);
    }
    return {
        missingItems: Array.from({ length: set.targetItemCount }, (_, index) => index + 1).some((index) => !byIndex.has(index)),
        ttsItemIds: [...byIndex.values()].filter((item) => item.status === "NOT_EVALUABLE").map((item) => item.itemId),
    };
}
