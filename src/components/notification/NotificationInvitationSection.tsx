import type { ReactNode } from "react";

type NotificationInvitationSectionProps = {
    title: string;
    description: string;
    count: number;
    children: ReactNode;
};

export default function NotificationInvitationSection({
    title,
    description,
    count,
    children,
}: NotificationInvitationSectionProps) {
    return (
        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="text-sm font-black text-white">
                        {title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                        {description}
                    </p>
                </div>

                <span className="inline-flex w-fit items-center rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-200">
                    {count}
                </span>
            </div>

            {children}
        </section>
    );
}
