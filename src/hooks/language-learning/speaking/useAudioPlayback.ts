"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { speakingAudioService } from "@/services/language-learning/speakingAudioService";

export function useAudioPlayback(url: string | null) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState(false);

    const cleanup = useCallback(() => {
        audioRef.current?.pause();
        audioRef.current = null;
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
    }, []);

    useEffect(() => cleanup, [cleanup, url]);

    const ensureAudio = useCallback(async () => {
        if (!url) return null;
        if (audioRef.current) return audioRef.current;

        setIsLoading(true);
        setError(false);
        try {
            let audio: HTMLAudioElement;
            if (url.startsWith("blob:")) {
                // Local recorder previews are already browser-managed object URLs.
                // Do not send them through apiClient or revoke them here because
                // useSpeakingSessionController owns their lifecycle.
                audio = new Audio(url);
            } else {
                const blob = await speakingAudioService.load(url);
                const objectUrl = URL.createObjectURL(blob);
                audio = new Audio(objectUrl);
                objectUrlRef.current = objectUrl;
            }
            audioRef.current = audio;

            audio.addEventListener("timeupdate", () => {
                setCurrentTime(audio.currentTime);
            });
            audio.addEventListener("loadedmetadata", () => {
                setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
            });
            audio.addEventListener("ended", () => {
                setIsPlaying(false);
                setCurrentTime(0);
            });
            audio.addEventListener("error", () => {
                setError(true);
                setIsPlaying(false);
            });
            return audio;
        } catch {
            setError(true);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [url]);

    const toggle = useCallback(
        async (playbackRate = 1) => {
            const audio = await ensureAudio();
            if (!audio) return;

            if (!audio.paused) {
                audio.pause();
                setIsPlaying(false);
                return;
            }

            audio.playbackRate = playbackRate;
            try {
                await audio.play();
                setIsPlaying(true);
            } catch {
                setError(true);
            }
        },
        [ensureAudio],
    );

    return {
        isPlaying,
        isLoading,
        currentTime,
        duration,
        error,
        toggle,
    };
}
