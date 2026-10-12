"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { InputHTMLAttributes, ReactNode } from "react";
import { AUTH_ERROR_MESSAGE_KEYS } from "@/lib/authPolicy";

export const authInputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100 dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-orange-500/20";
export const authButtonClass = "inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50";
export const authSecondaryClass = "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:text-slate-200 dark:hover:bg-white/5";

export function AuthPageFrame({ title, description, children, paperBackground = false }: {
    title: string;
    description: string;
    children: ReactNode;
    paperBackground?: boolean;
}) {
    // 로그인 화면은 기존 종이 질감 배경을 사용하고 회원가입 화면은 현재 배경을 유지한다.
    const backgroundClass = paperBackground
        ? "bg-[url('/images/translacat_common_background.png')] bg-cover bg-center bg-fixed bg-no-repeat"
        : "bg-orange-50/60 dark:bg-slate-950";

    return (
        <main className={`min-h-screen px-4 py-8 sm:py-12 ${backgroundClass}`}>
            <div className="mx-auto max-w-md">
                <Image
                    src="/images/translacat_log_transparent.png"
                    alt="TranslaCat"
                    width={180}
                    height={180}
                    priority
                    className="mx-auto -my-6"
                />
                <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-xl shadow-orange-100/40 dark:border-white/10 dark:bg-slate-900 dark:shadow-none sm:p-8">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h1>
                    <p className="mb-6 mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
                    {children}
                </section>
                <p className="mt-8 text-center text-xs text-slate-400">© 2026 TranslaCat</p>
            </div>
        </main>
    );
}

export function AuthField({ label, hint, id, ...props }: InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    hint?: string;
}) {
    return (
        <label className="block space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor={id}>
            <span>{label}</span>
            <input id={id} className={authInputClass} {...props} />
            {hint && (
                <span className="block text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">
                    {hint}
                </span>
            )}
        </label>
    );
}

export function AuthErrorMessage({ code }: { code: string | null }) {
    const t = useTranslations("Auth");
    if (!code) return null;
    const key = AUTH_ERROR_MESSAGE_KEYS[code] ?? code;
    return (
        <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700 dark:bg-red-500/10 dark:text-red-300"
        >
            {t.has(`errors.${key}`) ? t(`errors.${key}`) : t("errors.AUTH_UNAVAILABLE")}
        </p>
    );
}

export function PasswordFields({ password, confirmation, onPassword, onConfirmation, disabled }: {
    password: string;
    confirmation: string;
    onPassword: (value: string) => void;
    onConfirmation: (value: string) => void;
    disabled?: boolean;
}) {
    const t = useTranslations("Auth");
    return (
        <>
            <AuthField
                id="new-password"
                label={t("password")}
                hint={t("passwordHint")}
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(e) => onPassword(e.target.value)}
                disabled={disabled}
            />
            <AuthField
                id="confirm-password"
                label={t("confirmPassword")}
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                value={confirmation}
                onChange={(e) => onConfirmation(e.target.value)}
                disabled={disabled}
            />
        </>
    );
}
