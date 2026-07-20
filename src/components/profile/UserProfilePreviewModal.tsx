"use client";

import {
    IdCard,
    UserRound,
    X,
} from "lucide-react";
import {
    useEffect,
    useRef,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export interface UserProfilePreviewData {
    publicId: string;
    displayName: string;
    profileImageUrl: string | null;
    profileBackgroundImageUrl: string | null;
    bio: string | null;
}

interface UserProfilePreviewModalProps {
    isOpen: boolean;
    profile: UserProfilePreviewData | null;
    titleId: string;
    closeLabel: string;
    profileAlt: string;
    bioLabel: string;
    emptyBioText: string;
    isProcessing?: boolean;
    onClose: () => void;
    children?: ReactNode;
}

const FOCUSABLE_SELECTOR = [
    "button:not([disabled])",
    "a[href]",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function UserProfilePreviewModal({
    isOpen,
    profile,
    titleId,
    closeLabel,
    profileAlt,
    bioLabel,
    emptyBioText,
    isProcessing = false,
    onClose,
    children,
}: UserProfilePreviewModalProps) {
    const dialogRef = useRef<HTMLElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const focusTimer = window.setTimeout(() => {
            closeButtonRef.current?.focus();
        }, 0);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isProcessing) {
                event.preventDefault();
                onClose();
                return;
            }

            if (
                event.key !== "Tab" ||
                !dialogRef.current
            ) {
                return;
            }

            const focusableElements = Array.from(
                dialogRef.current.querySelectorAll<HTMLElement>(
                    FOCUSABLE_SELECTOR,
                ),
            );

            if (focusableElements.length === 0) {
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement =
                focusableElements[
                    focusableElements.length - 1
                ];

            if (
                event.shiftKey &&
                document.activeElement === firstElement
            ) {
                event.preventDefault();
                lastElement.focus();
            } else if (
                !event.shiftKey &&
                document.activeElement === lastElement
            ) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            window.clearTimeout(focusTimer);
            document.body.style.overflow = previousOverflow;
            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [isOpen, isProcessing, onClose]);

    if (
        !isOpen ||
        !profile ||
        typeof document === "undefined"
    ) {
        return null;
    }

    const bio =
        profile.bio?.trim() || emptyBioText;

    return createPortal(
        <div
            className="fixed inset-0 z-1200 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm sm:items-center sm:py-10"
            onMouseDown={() => {
                if (!isProcessing) {
                    onClose();
                }
            }}
        >
            <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative flex w-full max-w-md flex-col overflow-hidden rounded-4xl border border-white/20 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
                onClick={(event) =>
                    event.stopPropagation()
                }
            >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-112 overflow-hidden bg-linear-to-br from-orange-100 via-amber-50 to-slate-100 dark:from-orange-500/20 dark:via-slate-900 dark:to-slate-950">
                    {profile.profileBackgroundImageUrl ? (
                        // TODO: 실제 Storage public domain 확정 후 next/image 적용 재검토
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={
                                profile.profileBackgroundImageUrl
                            }
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover object-center"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-linear-to-br from-orange-100 via-amber-50 to-slate-100 dark:from-orange-500/20 dark:via-slate-900 dark:to-slate-950" />
                    )}

                    <div className="absolute inset-0 bg-linear-to-b from-black/5 via-slate-950/10 to-white dark:to-slate-950" />
                </div>

                <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    disabled={isProcessing}
                    aria-label={closeLabel}
                    className="absolute right-4 top-4 z-30 rounded-full bg-slate-950/60 p-2 text-white shadow-sm backdrop-blur-sm transition hover:bg-slate-950/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <X
                        className="h-4 w-4"
                        aria-hidden="true"
                    />
                </button>

                <div className="relative z-10 flex flex-col overflow-x-hidden px-6 pb-6">
                    <div className="flex flex-col items-center pt-[42%] sm:pt-[40%]">
                        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-linear-to-br from-orange-400 to-amber-300 text-white shadow-xl dark:border-slate-950">
                            {profile.profileImageUrl ? (
                                // TODO: 실제 Storage public domain 확정 후 next/image 적용 재검토
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={
                                        profile.profileImageUrl
                                    }
                                    alt={profileAlt}
                                    className="h-full w-full object-cover object-center"
                                />
                            ) : (
                                <UserRound
                                    className="h-12 w-12"
                                    aria-hidden="true"
                                />
                            )}
                        </div>

                        <h2
                            id={titleId}
                            className="mt-4 text-center text-2xl font-black text-slate-900 dark:text-white"
                        >
                            {profile.displayName}
                        </h2>

                        <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-slate-100/90 px-3 py-1.5 text-xs font-bold text-slate-500 backdrop-blur-sm dark:bg-white/10 dark:text-slate-300">
                            <IdCard
                                className="h-3.5 w-3.5 shrink-0"
                                aria-hidden="true"
                            />
                            <code className="truncate">
                                {profile.publicId}
                            </code>
                        </div>
                    </div>

                    <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/90 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">
                            {bioLabel}
                        </p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {bio}
                        </p>
                    </div>

                    {children}
                </div>
            </section>
        </div>,
        document.body,
    );
}
