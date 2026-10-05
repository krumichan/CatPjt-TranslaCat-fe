"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NovelPlayback, initialPlayback } from "@/features/novel/playback";
import { continuousReadingPlan } from "@/features/novel/recovery";
import { novelReaderService } from "@/services/novel/novelReaderService";
import { AUTH_SIGN_OUT_STARTED_EVENT } from "@/lib/authEvents";
import { NAVIGATION_STARTED_EVENT } from "@/lib/navigationEvents";
import { leavesReaderInCurrentTab } from "@/features/novel/navigationIntent";
import type { NovelLanguage, ReaderSnapshot, ReadingMode } from "@/types/novel/reader";

export function useNovelReadAloud(base: string, snapshot: ReaderSnapshot | null, locale: string, authenticated: boolean, traceId?: string, ownerScope?: string) {
    const [state, setState] = useState(initialPlayback);
    const [languageChoice, setLanguageChoice] = useState<{ locale: string; value: NovelLanguage } | null>(null);
    const language: NovelLanguage = languageChoice?.locale === locale ? languageChoice.value : locale === "ja" ? "ja" : "ko";
    const [rate, setRateState] = useState(1);
    const [follow, setFollow] = useState(false);
    const player = useRef<NovelPlayback | null>(null);
    const sessionEnding = useRef(false);
    const readingIntent = useRef<{ mode: ReadingMode; selectedId?: string; language: NovelLanguage; revision: string } | null>(null);
    const revision = snapshot?.revision;
    const policyVersion = snapshot?.audioPolicyVersion;
    const translationPolicy = `${snapshot?.policyVersion ?? ""}:${snapshot?.glossaryVersion ?? ""}`;

    useEffect(() => { sessionEnding.current = false; }, [authenticated, ownerScope]);

    useEffect(() => {
        // signOut의 CSRF/서버 왕복보다 먼저 중단하고 같은 세션의 늦은 클릭도 막는다.
        const stopForSignOut = () => {
            readingIntent.current = null;
            sessionEnding.current = true;
            player.current?.stop();
        };
        window.addEventListener(AUTH_SIGN_OUT_STARTED_EVENT, stopForSignOut);
        return () => window.removeEventListener(AUTH_SIGN_OUT_STARTED_EVENT, stopForSignOut);
    }, []);

    useEffect(() => {
        const stopForNavigation = () => { readingIntent.current = null; player.current?.stop(); };
        const onAnchor = (event: MouseEvent) => {
            const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
            if (!(anchor instanceof HTMLAnchorElement)) return;
            if (leavesReaderInCurrentTab({ button: event.button, altKey: event.altKey, ctrlKey: event.ctrlKey,
                metaKey: event.metaKey, shiftKey: event.shiftKey, defaultPrevented: event.defaultPrevented,
                download: anchor.hasAttribute("download"), target: anchor.target, href: anchor.href, currentHref: window.location.href })) {
                stopForNavigation();
            }
        };

        // 이동·언어 전환의 사용자 의사를 먼저 받아, 늦은 라우터 응답 사이의 lookahead를 막는다.
        document.addEventListener("click", onAnchor, true);
        window.addEventListener(NAVIGATION_STARTED_EVENT, stopForNavigation);
        window.addEventListener("pagehide", stopForNavigation);
        window.addEventListener("popstate", stopForNavigation);
        return () => {
            document.removeEventListener("click", onAnchor, true);
            window.removeEventListener(NAVIGATION_STARTED_EVENT, stopForNavigation);
            window.removeEventListener("pagehide", stopForNavigation);
            window.removeEventListener("popstate", stopForNavigation);
        };
    }, []);

    useEffect(() => {
        if (!revision || !authenticated) return;
        const instance = new NovelPlayback({
            fetchAudio: (id, lang, part, signal) => novelReaderService.audio(base, revision, id, lang, part, signal, traceId),
            createAudio: url => new Audio(url),
            createUrl: blob => URL.createObjectURL(blob),
            revokeUrl: url => URL.revokeObjectURL(url),
            now: () => performance.now(),
            onChange: setState,
        });
        player.current = instance;
        return () => {
            instance.dispose();
            if (player.current === instance) player.current = null;
        };
    }, [authenticated, ownerScope, base, revision, locale, policyVersion, translationPolicy, traceId]);

    useEffect(() => { player.current?.setRate(rate); }, [rate, ownerScope, base, revision, locale, policyVersion, translationPolicy, traceId]);

    useEffect(() => {
        const intent = readingIntent.current;
        if (!snapshot || !intent || intent.revision !== snapshot.revision || !authenticated || sessionEnding.current) return;
        try {
            const plan = continuousReadingPlan(snapshot, intent.mode, intent.language, intent.selectedId);
            player.current?.appendReady(plan.queue, intent.language, plan.awaitingMore);
        } catch { /* A pending location has no audio yet; no implicit synthesis. */ }
    }, [snapshot, authenticated]);

    // 따라가기는 명시적으로 켠 경우만 적용한다. 수동 스크롤은 즉시 우선한다.
    useEffect(() => {
        if (!follow) return;
        const cancelFollow = () => setFollow(false);
        window.addEventListener("wheel", cancelFollow, { passive: true });
        window.addEventListener("touchmove", cancelFollow, { passive: true });
        return () => {
            window.removeEventListener("wheel", cancelFollow);
            window.removeEventListener("touchmove", cancelFollow);
        };
    }, [follow]);

    useEffect(() => {
        if (follow && state.status === "playing" && state.segmentId) {
            document.getElementById(`novel-segment-${state.segmentId}`)?.scrollIntoView({ block: "center", behavior: "instant" });
        }
    }, [follow, state.segmentId, state.status]);

    const read = useCallback((mode: ReadingMode, selectedId?: string, requestedLanguage = language) => {
        if (!snapshot || !authenticated || sessionEnding.current) return;
        try {
            const plan = continuousReadingPlan(snapshot, mode, requestedLanguage, selectedId);
            readingIntent.current = { mode, selectedId, language: requestedLanguage, revision: snapshot.revision };
            setLanguageChoice({ locale, value: requestedLanguage });
            player.current?.start(plan.queue, requestedLanguage, plan.awaitingMore);
        } catch {
            player.current?.stop();
            setState({ ...initialPlayback, status: "error", error: "TRANSLATION_NOT_READY" });
        }
    }, [snapshot, authenticated, language, locale]);

    return {
        ...state, language, rate, follow, read, setFollow,
        setLanguage: (value: NovelLanguage) => { readingIntent.current = null; player.current?.stop(); setLanguageChoice({ locale, value }); },
        setRate: (value: number) => setRateState(Number.isFinite(value) ? Math.max(0.5, Math.min(2, value)) : 1),
        pause: () => player.current?.pause(),
        resume: () => { if (!sessionEnding.current) void player.current?.resume(); },
        stop: () => { readingIntent.current = null; player.current?.stop(); },
        skip: (delta: number) => { if (!sessionEnding.current) player.current?.skip(delta); },
        retry: () => { if (!sessionEnding.current) player.current?.retry(); },
    };
}

export type NovelReadAloud = ReturnType<typeof useNovelReadAloud>;
