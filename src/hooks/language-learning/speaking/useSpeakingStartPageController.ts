"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SPEAKING_VOICE_OPTIONS } from "@/constants/language-learning/speaking";
import {
    clearSpeakingSessionIdempotencyKey,
    getOrCreateSpeakingSessionIdempotencyKey,
} from "@/features/language-learning/speaking/session/speakingSessionStorage";
import { useLanguageLearningEntryState } from "@/hooks/language-learning/useLanguageLearningEntryState";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/navigation";
import { speakingSessionService } from "@/services/language-learning/speakingSessionService";
import { speakingTopicService } from "@/services/language-learning/speakingTopicService";
import type {
    ConversationStartMode,
    CorrectionMode,
    SpeakingPracticeMode,
    SpeakingSessionCreateRequest,
    SpeakingTopicCategory,
} from "@/types/language-learning/speaking";

interface SpeakingSessionDraft {
    topicId: number | null;
    customTopic: string | null;
    goal: string | null;
    persona: string | null;
    practiceMode: SpeakingPracticeMode;
    conversationStartMode: ConversationStartMode;
    correctionMode: CorrectionMode;
    targetMinutes: number;
    voiceId: string;
    playbackSpeed: string;
}

function createRequestFingerprint(draft: SpeakingSessionDraft): string {
    return JSON.stringify(draft);
}

export function useSpeakingStartPageController() {
    const router = useRouter();
    const entry = useLanguageLearningEntryState();
    const [category, setCategory] = useState<SpeakingTopicCategory | "ALL">(
        "ALL",
    );
    const [practiceMode, setPracticeMode] = useState<SpeakingPracticeMode | null>(null);
    const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
    const [useCustomTopic, setUseCustomTopic] = useState(false);
    const [customTopic, setCustomTopic] = useState("");
    const [goal, setGoal] = useState("");
    const [persona, setPersona] = useState("");
    const [startMode, setStartMode] =
        useState<ConversationStartMode>("AI_FIRST");
    const [correctionMode, setCorrectionMode] =
        useState<CorrectionMode>("CONVERSATION");
    const [targetMinutes, setTargetMinutes] = useState(5);
    const [voiceId, setVoiceId] = useState<string>(
        SPEAKING_VOICE_OPTIONS[0].id,
    );
    const [playbackSpeed, setPlaybackSpeed] = useState("NORMAL");
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState(false);

    const canLoad = entry.setting?.configured === true;
    const topicQuery = useQuery({
        keys: canLoad
            ? ([
                  "speaking-topics",
                  entry.setting?.learningLanguage ?? null,
                  category,
              ] as const)
            : null,
        fetcher: (_key, learningLanguage, selectedCategory) =>
            speakingTopicService.getAll({
                learningLanguage,
                category:
                    selectedCategory === "ALL" ? null : selectedCategory,
            }),
        config: { revalidateOnMount: true },
    });
    const activeSessionQuery = useQuery({
        keys: canLoad ? (["speaking-active-session"] as const) : null,
        fetcher: () => speakingSessionService.getActive(),
        config: { revalidateOnMount: true },
    });
    const modeStatusQuery = useQuery({
        keys: canLoad ? (["speaking-today-mode-status"] as const) : null,
        fetcher: () => speakingSessionService.getTodayStatus(),
        config: { revalidateOnMount: true, shouldRetryOnError: false },
    });

    const hasPendingModeEvaluation = (modeStatusQuery.data ?? []).some(
        (status) =>
            status.sessionStatus === "EVALUATING" ||
            status.evaluationStatus === "PENDING" ||
            status.evaluationStatus === "EVALUATING",
    );

    useEffect(() => {
        if (!hasPendingModeEvaluation) return;
        const timer = window.setInterval(() => {
            void modeStatusQuery.mutate(undefined, true);
        }, 2000);
        return () => window.clearInterval(timer);
    }, [hasPendingModeEvaluation, modeStatusQuery.mutate]);

    useEffect(() => {
        const setting = entry.setting;
        if (!setting) return;

        // Pending goal changes are a next-learning-day policy. A session created
        // today must start from the currently active goal, not the pending value.
        setTargetMinutes(setting.dailySpeakingGoalMinutes ?? 5);
        setVoiceId(setting.speakingVoiceId || SPEAKING_VOICE_OPTIONS[0].id);
        setPlaybackSpeed(setting.speakingPlaybackSpeed || "NORMAL");
    }, [entry.setting]);

    const selectedTopic = useMemo(
        () =>
            topicQuery.data?.find((topic) => topic.id === selectedTopicId) ??
            null,
        [selectedTopicId, topicQuery.data],
    );

    useEffect(() => {
        if (selectedTopic?.recommendedStartMode) {
            setStartMode(selectedTopic.recommendedStartMode);
        }
    }, [selectedTopic]);

    const minGoal = entry.setting?.minDailySpeakingGoalMinutes ?? 3;
    const maxGoal = entry.setting?.maxDailySpeakingGoalMinutes ?? 20;
    const hasTopic = useCustomTopic
        ? customTopic.trim().length >= 2
        : selectedTopicId !== null;
    const activeSessionResolved =
        !activeSessionQuery.isLoading && !activeSessionQuery.isError;
    const isValid =
        activeSessionResolved &&
        !activeSessionQuery.data &&
        practiceMode !== null &&
        hasTopic &&
        targetMinutes >= minGoal &&
        targetMinutes <= maxGoal &&
        Boolean(voiceId);

    const createSession = useCallback(async () => {
        if (!isValid || isCreating) return false;

        const draft: SpeakingSessionDraft = {
            topicId: useCustomTopic ? null : selectedTopicId,
            customTopic: useCustomTopic ? customTopic.trim() : null,
            goal: goal.trim() || null,
            persona: persona.trim() || null,
            practiceMode: practiceMode!,
            conversationStartMode: startMode,
            correctionMode,
            targetMinutes,
            voiceId,
            playbackSpeed,
        };
        const idempotencyKey = getOrCreateSpeakingSessionIdempotencyKey(
            createRequestFingerprint(draft),
        );
        const request: SpeakingSessionCreateRequest = {
            ...draft,
            idempotencyKey,
        };

        setIsCreating(true);
        setCreateError(false);
        try {
            const session = await speakingSessionService.create(request);
            clearSpeakingSessionIdempotencyKey();
            router.push(`/language-learning/speaking/${session.id}`);
            return true;
        } catch (error) {
            // Keep the idempotency key. A retry after a lost response must not
            // create a duplicate session. A changed draft gets a new key.
            console.error("Failed to create speaking session.", error);
            setCreateError(true);
            return false;
        } finally {
            setIsCreating(false);
        }
    }, [
        correctionMode,
        customTopic,
        goal,
        isCreating,
        isValid,
        persona,
        practiceMode,
        playbackSpeed,
        router,
        selectedTopicId,
        startMode,
        targetMinutes,
        useCustomTopic,
        voiceId,
    ]);

    return {
        entry,
        topics: topicQuery.data ?? [],
        topicsLoading: topicQuery.isLoading,
        topicsError: Boolean(topicQuery.isError),
        activeSession: activeSessionQuery.data ?? null,
        activeSessionLoading: activeSessionQuery.isLoading,
        activeSessionError: Boolean(activeSessionQuery.isError),
        modeStatuses: modeStatusQuery.data ?? [],
        modeStatusError: Boolean(modeStatusQuery.isError),
        practiceMode,
        category,
        selectedTopicId,
        selectedTopic,
        useCustomTopic,
        customTopic,
        goal,
        persona,
        startMode,
        correctionMode,
        targetMinutes,
        voiceId,
        playbackSpeed,
        minGoal,
        maxGoal,
        isCreating,
        createError,
        isValid,
        setPracticeMode: (mode: SpeakingPracticeMode) => {
            setPracticeMode(mode);
            if (mode !== "FREE") {
                setStartMode("AI_FIRST");
            }
            setCreateError(false);
        },
        setCategory,
        selectTopic: (topicId: number) => {
            setUseCustomTopic(false);
            setSelectedTopicId(topicId);
            setCreateError(false);
        },
        selectCustomTopic: () => {
            setUseCustomTopic(true);
            setSelectedTopicId(null);
            setCreateError(false);
        },
        setCustomTopic,
        setGoal,
        setPersona,
        setStartMode,
        setCorrectionMode,
        setTargetMinutes,
        setVoiceId,
        setPlaybackSpeed,
        createSession,
        reload: async () => {
            await Promise.all([
                topicQuery.mutate(undefined, true),
                activeSessionQuery.mutate(undefined, true),
                modeStatusQuery.mutate(undefined, true),
            ]);
        },
    };
}

export type SpeakingStartPageController = ReturnType<
    typeof useSpeakingStartPageController
>;
