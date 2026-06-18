import { useTranslations } from "next-intl";

import SettingsSubPageHeader from "@/components/settings/SettingsSubPageHeader";

export default function CurrencySettingsHeader() {
    const t = useTranslations("Settings.currencyPage");

    return (
        <SettingsSubPageHeader
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
        />
    );
}