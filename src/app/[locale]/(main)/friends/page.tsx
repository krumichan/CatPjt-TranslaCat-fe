import { redirect } from "next/navigation";

interface FriendsPageProps {
    params: Promise<{
        locale: string;
    }>;
}

export default async function FriendsPage({
    params,
}: FriendsPageProps) {
    const { locale } = await params;

    redirect(`/${locale}/chat?tab=friends`);
}
