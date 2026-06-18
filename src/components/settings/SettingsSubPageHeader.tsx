import SettingsBackButton from "@/components/settings/SettingsBackButton";

type SettingsSubPageHeaderProps = {
    eyebrow: string;
    title: string;
    description: string;
    backVariant?: "default" | "ghost" | "icon";
};

export default function SettingsSubPageHeader({
    eyebrow,
    title,
    description,
    backVariant = "default",
}: SettingsSubPageHeaderProps) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
            <SettingsBackButton variant={backVariant} />

            <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-500">
                    {eyebrow}
                </p>

                <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                    {title}
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {description}
                </p>
            </div>
        </section>
    );
}