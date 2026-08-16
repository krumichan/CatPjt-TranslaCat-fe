import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import { authOptions } from "@/lib/auth";

export default async function NovelLayout({
    children,
}: {
    children: ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (session?.user?.role !== "ADMIN") {
        notFound();
    }

    return children;
}
