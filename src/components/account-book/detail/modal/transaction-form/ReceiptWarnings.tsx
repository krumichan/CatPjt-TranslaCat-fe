import { useTranslations } from "next-intl";

/** 異なる解析コードが同じ案内に対応する場合も、一文だけ表示する。 */
export default function ReceiptWarnings({ warnings }: { warnings: string[] }) {
    const t = useTranslations("AccountBook.detail.transactionModal.receipt.review");
    if (!warnings.length) return null;
    const messages = new Set(warnings.map((warning) =>
        t.has(`warningCodes.${warning}`) ? t(`warningCodes.${warning}`) : t("unknownWarning"),
    ));
    return (
        <ul className="mt-3 list-inside list-disc space-y-1 break-words text-xs text-amber-700 dark:text-amber-300" aria-label={t("warnings")}>
            {[...messages].map((message) => <li key={message}>{message}</li>)}
        </ul>
    );
}
