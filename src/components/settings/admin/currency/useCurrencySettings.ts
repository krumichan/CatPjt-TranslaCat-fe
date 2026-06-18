import {
    SyntheticEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import { AdminCurrency, CurrencyUpdateRequest } from "@/types/currency";
import { adminCurrencyService } from "@/services/currency/adminCurrencyService";

export function useCurrencySettings() {
    const t = useTranslations("Settings.currencyPage");
    const { data: session, status } = useSession();

    const [currencies, setCurrencies] = useState<AdminCurrency[]>([]);
    const [keyword, setKeyword] = useState("");

    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [symbol, setSymbol] = useState("");
    const [decimalPlaces, setDecimalPlaces] = useState("0");
    const [baseCurrency, setBaseCurrency] = useState(false);

    const [editingCurrency, setEditingCurrency] =
        useState<AdminCurrency | null>(null);
    const [deleteTargetCurrency, setDeleteTargetCurrency] =
        useState<AdminCurrency | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
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

        if (status === "authenticated" && !isAdmin) {
            setIsLoading(false);
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

    const handleSubmit = async (event: SyntheticEvent) => {
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
                !currency.enabled,
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

    const openEditModal = (currency: AdminCurrency) => {
        if (isUpdating || isDeleting) {
            return;
        }

        setEditingCurrency(currency);
    };

    const closeEditModal = () => {
        if (isUpdating) {
            return;
        }

        setEditingCurrency(null);
    };

    const handleUpdateCurrency = async (
        request: CurrencyUpdateRequest,
    ) => {
        if (!editingCurrency || isUpdating) {
            return;
        }

        try {
            setIsUpdating(true);
            setErrorMessage(null);

            await adminCurrencyService.update(
                editingCurrency.id,
                request,
            );

            setEditingCurrency(null);
            await loadCurrencies();
        } catch (error) {
            console.error(error);
            setErrorMessage(t("messages.updateFailed"));
        } finally {
            setIsUpdating(false);
        }
    };

    const openDeleteConfirm = (currency: AdminCurrency) => {
        if (isUpdating || isDeleting) {
            return;
        }

        setDeleteTargetCurrency(currency);
    };

    const closeDeleteConfirm = () => {
        if (isDeleting) {
            return;
        }

        setDeleteTargetCurrency(null);
    };

    const handleDeleteCurrency = async () => {
        if (!deleteTargetCurrency || isDeleting) {
            return;
        }

        try {
            setIsDeleting(true);
            setErrorMessage(null);

            await adminCurrencyService.delete(deleteTargetCurrency.id);

            setDeleteTargetCurrency(null);
            await loadCurrencies();
        } catch (error) {
            console.error(error);
            setErrorMessage(t("messages.deleteFailed"));
        } finally {
            setIsDeleting(false);
        }
    };

    return {
        status,
        isAdmin,

        currencies,
        filteredCurrencies,
        keyword,
        setKeyword,

        code,
        setCode,
        name,
        setName,
        symbol,
        setSymbol,
        decimalPlaces,
        setDecimalPlaces,
        baseCurrency,
        setBaseCurrency,

        isLoading,
        isSubmitting,
        errorMessage,
        canSubmit,

        editingCurrency,
        deleteTargetCurrency,
        isEditModalOpen: editingCurrency !== null,
        isDeleteConfirmOpen: deleteTargetCurrency !== null,
        isUpdating,
        isDeleting,

        handleSubmit,
        handleToggleEnabled,
        handleSetBaseCurrency,

        openEditModal,
        closeEditModal,
        handleUpdateCurrency,
        openDeleteConfirm,
        closeDeleteConfirm,
        handleDeleteCurrency,
    };
}