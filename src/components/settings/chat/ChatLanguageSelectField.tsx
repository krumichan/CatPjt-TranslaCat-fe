import { CHAT_LANGUAGE_OPTIONS } from "@/constants/chatLanguages";

type ChatLanguageSelectFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
};

export default function ChatLanguageSelectField({
    label,
    value,
    onChange,
}: ChatLanguageSelectFieldProps) {
    return (
        <label className="block">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {label}
            </span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="
                    w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800
                    outline-none transition
                    focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200
                    dark:border-white/10 dark:bg-black/30 dark:text-white
                    dark:focus:bg-black/30 dark:focus:ring-orange-500/20
                    dark:scheme-dark
                    [&>option]:bg-white [&>option]:text-gray-800
                    dark:[&>option]:bg-zinc-900 dark:[&>option]:text-white
                "
            >
                {CHAT_LANGUAGE_OPTIONS.map((language) => (
                    <option key={language.code} value={language.code}>
                        {language.label}
                    </option>
                ))}
            </select>
        </label>
    );
}