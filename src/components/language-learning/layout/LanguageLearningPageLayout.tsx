import type { ReactNode } from "react";

import { LanguageLearningHero } from "@/components/language-learning/layout/LanguageLearningHero";
import { LanguageLearningTabNavigation } from "@/components/language-learning/layout/LanguageLearningTabNavigation";

interface LanguageLearningPageLayoutProps {
    title: string;
    description: string;
    children: ReactNode;
    eyebrow?: string;
}

export function LanguageLearningPageLayout({
    title,
    description,
    children,
    eyebrow,
}: LanguageLearningPageLayoutProps) {
    return (
        <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 dark:bg-slate-950 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                <LanguageLearningHero
                    title={title}
                    description={description}
                    eyebrow={eyebrow}
                />

                <LanguageLearningTabNavigation />

                <section className="min-w-0">
                    {children}
                </section>
            </div>
        </main>
    );
}
