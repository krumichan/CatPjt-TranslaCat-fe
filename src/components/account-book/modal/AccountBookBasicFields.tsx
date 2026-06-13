import { useTranslations } from "next-intl";

export const DIRECT_INPUT_VALUE = "__DIRECT_INPUT__";

type AccountBookBasicFieldsProps = {
    translationKey: "AccountBook.createModal" | "AccountBook.editModal";

    name: string;
    description: string;

    categoryOptions: string[];
    categorySelectValue: string;
    isDirectInput: boolean;
    newCategoryName: string;

    onChangeName: (value: string) => void;
    onChangeDescription: (value: string) => void;
    onChangeCategorySelectValue: (value: string) => void;
    onChangeNewCategoryName: (value: string) => void;
};

export default function AccountBookBasicFields({
   translationKey,
   name,
   description,
   categoryOptions,
   categorySelectValue,
   isDirectInput,
   newCategoryName,
   onChangeName,
   onChangeDescription,
   onChangeCategorySelectValue,
   onChangeNewCategoryName,
}: AccountBookBasicFieldsProps) {
    const t = useTranslations(translationKey);

    return (
        <>
            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                    {t("fields.name")}
                    <span className="text-orange-500">*</span>
                </span>
                <input
                    value={name}
                    onChange={(event) => onChangeName(event.target.value)}
                    placeholder={t("placeholders.name")}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                />
            </label>

            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                    {t("fields.category")}
                    <span className="text-orange-500">*</span>
                </span>
                <select
                    value={categorySelectValue}
                    onChange={(event) =>
                        onChangeCategorySelectValue(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:bg-black/40 dark:focus:ring-orange-500/20 dark:scheme-dark [&>option]:bg-white [&>option]:text-gray-800 dark:[&>option]:bg-zinc-900 dark:[&>option]:text-white"
                >
                    {categoryOptions.map((categoryName) => (
                        <option key={categoryName} value={categoryName}>
                            {categoryName}
                        </option>
                    ))}
                    <option value={DIRECT_INPUT_VALUE}>
                        {t("fields.directInput")}
                    </option>
                </select>

                {isDirectInput && (
                    <input
                        value={newCategoryName}
                        onChange={(event) =>
                            onChangeNewCategoryName(event.target.value)
                        }
                        placeholder={t("placeholders.category")}
                        className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                    />
                )}
            </label>

            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                    {t("fields.description")}
                </span>
                <textarea
                    value={description}
                    onChange={(event) =>
                        onChangeDescription(event.target.value)
                    }
                    placeholder={t("placeholders.description")}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                />
            </label>
        </>
    );
}