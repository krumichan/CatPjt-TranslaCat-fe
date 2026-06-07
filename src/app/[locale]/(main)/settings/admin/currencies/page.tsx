"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SyntheticEvent } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { AdminCurrency } from "@/types/currency";
import { adminCurrencyService } from "@/services/currency/adminCurrencyService";
import SettingsBackButton from "@/components/settings/SettingsBackButton";
import CurrencySettingsHeader from "@/components/settings/currency/CurrencySettingsHeader";
import CurrencyCreateForm from "@/components/settings/currency/CurrencyCreateForm";
import CurrencyListSection from "@/components/settings/currency/CurrencyListSection";

export default function CurrencySettingsPage() {
    const t = useTranslations("Settings.currencyPage");
    const { data: session, status } = useSession();

    const [currencies, setCurrencies] = useState<AdminCurrency[]>([]);
    const [keyword, setKeyword] = useState("");

    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [symbol, setSymbol] = useState("");
    const [decimalPlaces, setDecimalPlaces] = useState("0");
    const [baseCurrency, setBaseCurrency] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isAdmin = session?.user?.role === "ADMIN";

    const loadCurrencies = useCallback(async () => {
        try {
            setIsLoading(true);
            setErrorMessage(null);

            const items = await adminCurrencyService.list();
            setCurrencies(items);
        } catch (error) {
            console.error(error);
            setErrorMessage(t("messages.loadFailed"));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (status === "authenticated" && isAdmin) {
            void loadCurrencies();
        }
    }, [status, isAdmin, loadCurrencies]);

    const filteredCurrencies = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLowerCase();

        if (!normalizedKeyword) {
            return currencies;
        }

        return currencies.filter((currency) => {
            return (
                currency.code.toLowerCase().includes(normalizedKeyword) ||
                currency.name.toLowerCase().includes(normalizedKeyword) ||
                (currency.symbol ?? "")
                    .toLowerCase()
                    .includes(normalizedKeyword)
            );
        });
    }, [currencies, keyword]);

    const canSubmit =
        !!code.trim() &&
        !!name.trim() &&
        !isSubmitting &&
        status === "authenticated" &&
        isAdmin;

    const resetForm = () => {
        setCode("");
        setName("");
        setSymbol("");
        setDecimalPlaces("0");
        setBaseCurrency(false);
    };

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        try {
            setIsSubmitting(true);
            setErrorMessage(null);

            await adminCurrencyService.create({
                code: code.trim().toUpperCase(),
                name: name.trim(),
                symbol: symbol.trim() || null,
                decimalPlaces: Number(decimalPlaces || 0),
                baseCurrency,
            });

            resetForm();
            await loadCurrencies();
        } catch (error) {
            console.error(error);
            setErrorMessage(t("messages.createFailed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleEnabled = async (currency: AdminCurrency) => {
        try {
            setErrorMessage(null);

            await adminCurrencyService.updateEnabled(
                currency.id,
                !currency.enabled
            );

            await loadCurrencies();
        } catch (error) {
            console.error(error);
            setErrorMessage(t("messages.updateFailed"));
        }
    };

    const handleSetBaseCurrency = async (currency: AdminCurrency) => {
        if (currency.baseCurrency) {
            return;
        }

        if (!currency.enabled) {
            setErrorMessage(t("messages.disabledBaseCurrency"));
            return;
        }

        try {
            setErrorMessage(null);

            await adminCurrencyService.setBaseCurrency(currency.id);

            await loadCurrencies();
        } catch (error) {
            console.error(error);
            setErrorMessage(t("messages.updateFailed"));
        }
    };

    if (status === "loading") {
        return (
            <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="rounded-3xl border border-white/70 bg-white/90 p-8 text-center text-sm font-semibold text-slate-500 shadow-xl dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300">
                    {t("messages.loading")}
                </div>
            </main>
        );
    }

    if (!isAdmin) {
        return (
            <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                    {t("messages.forbidden")}
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto mt-20 flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
            <CurrencySettingsHeader />

            {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                    {errorMessage}
                </div>
            )}

            <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
                <CurrencyCreateForm
                    code={code}
                    name={name}
                    symbol={symbol}
                    decimalPlaces={decimalPlaces}
                    baseCurrency={baseCurrency}
                    canSubmit={canSubmit}
                    isSubmitting={isSubmitting}
                    onChangeCode={setCode}
                    onChangeName={setName}
                    onChangeSymbol={setSymbol}
                    onChangeDecimalPlaces={setDecimalPlaces}
                    onChangeBaseCurrency={setBaseCurrency}
                    onSubmit={handleSubmit}
                />

                <CurrencyListSection
                    currencies={filteredCurrencies}
                    keyword={keyword}
                    isLoading={isLoading}
                    onChangeKeyword={setKeyword}
                    onSetBaseCurrency={handleSetBaseCurrency}
                    onToggleEnabled={handleToggleEnabled}
                />
            </section>
        </main>
    );
}