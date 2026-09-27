import { useTranslations } from "next-intl";

export default function ReceiptWarnings({ warnings }: { warnings: string[] }) {
    const t = useTranslations("AccountBook.detail.transactionModal.receipt.review");
    if (!warnings.length) return null;
    return (
        <ul className="mt-3 list-inside list-disc space-y-1 break-words text-xs text-amber-700 dark:text-amber-300" aria-label={t("warnings")}>
            {[...new Set(warnings)].map((warning) => <li key={warning}>{t.has(`warningCodes.${warning}`) ? t(`warningCodes.${warning}`) : t("unknownWarning")}</li>)}
        </ul>
    );
}
