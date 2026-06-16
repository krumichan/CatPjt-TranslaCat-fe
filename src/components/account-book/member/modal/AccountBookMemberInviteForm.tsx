import { SyntheticEvent } from "react";
import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

type AccountBookMemberInviteFormProps = {
    publicId: string;
    isInviting: boolean;
    isBusy: boolean;
    canInvite: boolean;
    onPublicIdChange: (publicId: string) => void;
    onInvite: (event: SyntheticEvent) => void;
};

export default function AccountBookMemberInviteForm({
    publicId,
    isInviting,
    isBusy,
    canInvite,
    onPublicIdChange,
    onInvite,
}: AccountBookMemberInviteFormProps) {
    const t = useTranslations("AccountBook.memberModal");

    return (
        <form
            onSubmit={onInvite}
            className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-black/25"
        >
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("fields.publicId")}
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    value={publicId}
                    onChange={(event) =>
                        onPublicIdChange(event.target.value)
                    }
                    disabled={isBusy}
                    placeholder={t("placeholders.publicId")}
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-orange-500/20"
                />

                <button
                    type="submit"
                    disabled={!canInvite}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.25)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
                >
                    <UserPlus size={18} />
                    {isInviting
                        ? t("actions.inviting")
                        : t("actions.invite")}
                </button>
            </div>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {t("helps.publicId")}
            </p>
        </form>
    );
}