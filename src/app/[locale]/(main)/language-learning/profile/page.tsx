import { redirect } from "next/navigation";

interface LanguageLearningProfileRoutePageProps {
    params: Promise<{
        locale: string;
    }>;
}

export default async function LanguageLearningProfileRoutePage({
    params,
}: LanguageLearningProfileRoutePageProps) {
    const { locale } = await params;

    redirect(`/${locale}/language-learning#learning-profile`);
}
