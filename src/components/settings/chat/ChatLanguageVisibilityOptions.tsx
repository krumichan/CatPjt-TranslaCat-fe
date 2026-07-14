type ChatLanguageVisibilityOptionsProps = {
    showOriginal: boolean;
    showTranslation: boolean;
    showOriginalLabel: string;
    showTranslationLabel: string;
    onShowOriginalChange: (checked: boolean) => void;
    onShowTranslationChange: (checked: boolean) => void;
};

export default function ChatLanguageVisibilityOptions({
    showOriginal,
    showTranslation,
    showOriginalLabel,
    showTranslationLabel,
    onShowOriginalChange,
    onShowTranslationChange,
}: ChatLanguageVisibilityOptionsProps) {
    return (
        <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950 md:grid-cols-2">
            <label className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                <input
                    type="checkbox"
                    checked={showOriginal}
                    onChange={(event) =>
                        onShowOriginalChange(event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300"
                />
                {showOriginalLabel}
            </label>

            <label className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                <input
                    type="checkbox"
                    checked={showTranslation}
                    onChange={(event) =>
                        onShowTranslationChange(event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300"
                />
                {showTranslationLabel}
            </label>
        </div>
    );
}