import { Ban, CircleHelp, Search, UserPlus, UsersRound, X } from "lucide-react";
import { useTranslations } from "next-intl";

type FriendListToolbarProps = {
    totalCount: number;
    filteredCount: number;
    selectedCount: number;
    blockedCount: number;
    searchKeyword: string;
    isGroupSelectionMode: boolean;
    onSearchChange: (value: string) => void;
    onClearSearch: () => void;
    onOpenFriendSearch: () => void;
    onOpenBlockList: () => void;
    onOpenHelp: () => void;
    onToggleGroupSelectionMode: () => void;
    onClearSelection: () => void;
    onGoToGroupChatCreate: () => Promise<boolean>;
};

export default function FriendListToolbar({
    totalCount,
    filteredCount,
    selectedCount,
    blockedCount,
    searchKeyword,
    isGroupSelectionMode,
    onSearchChange,
    onClearSearch,
    onOpenFriendSearch,
    onOpenBlockList,
    onOpenHelp,
    onToggleGroupSelectionMode,
    onClearSelection,
    onGoToGroupChatCreate,
}: FriendListToolbarProps) {
    const t = useTranslations("Social.friendListPage");

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                        {t("list.eyebrow")}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                            {t("list.title")}
                        </h2>
                        <button
                            type="button"
                            onClick={onOpenHelp}
                            aria-label={t("actions.openHelp")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-orange-50 hover:text-orange-500 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-200"
                        >
                            <CircleHelp
                                className="h-5 w-5"
                                aria-hidden="true"
                            />
                        </button>
                    </div>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {t("list.count", {
                            totalCount,
                            filteredCount,
                        })}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={onOpenFriendSearch}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                    >
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        {t("actions.findFriend")}
                    </button>

                    <button
                        type="button"
                        onClick={onOpenBlockList}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                    >
                        <Ban className="h-4 w-4" aria-hidden="true" />
                        {t("actions.openBlockList", {
                            count: blockedCount,
                        })}
                    </button>

                    <button
                        type="button"
                        onClick={onToggleGroupSelectionMode}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
                            isGroupSelectionMode
                                ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                        }`}
                    >
                        <UsersRound
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                        {isGroupSelectionMode
                            ? t("actions.groupSelectionOn")
                            : t("actions.groupSelection")}
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
                <label className="relative flex-1">
                    <span className="sr-only">{t("fields.search")}</span>
                    <Search
                        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                    />
                    <input
                        type="text"
                        value={searchKeyword}
                        onChange={(event) =>
                            onSearchChange(event.target.value)
                        }
                        placeholder={t("placeholders.search")}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-orange-400 dark:focus:bg-white/10 dark:focus:ring-orange-400/10"
                    />
                    {searchKeyword && (
                        <button
                            type="button"
                            onClick={onClearSearch}
                            aria-label={t("actions.clearSearch")}
                            className="absolute right-3 top-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    )}
                </label>

                {isGroupSelectionMode && (
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClearSelection}
                            disabled={selectedCount === 0}
                            className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                        >
                            {t("actions.clearSelection")}
                        </button>
                        <button
                            type="button"
                            onClick={onGoToGroupChatCreate}
                            disabled={selectedCount === 0}
                            className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                        >
                            {t("actions.createGroup", {
                                count: selectedCount,
                            })}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
