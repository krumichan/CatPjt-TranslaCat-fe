"use client";

import FullPageError from "@/components/common/FullPageError";
import {useRouter} from "@/navigation";
import {useSearchParams} from "next/navigation";

export default function AuthErrorPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const error = searchParams.get("error");

    let errorMessage = "An error occurred during authentication.";
    if (error === "AccessDenied") {
        errorMessage = "Your email is not registered in the access list. Please contact the administrator.";
    } else if (error === "Verification") {
        errorMessage = "The verification link is no longer valid or has already been used.";
    }

    return (
        <FullPageError
            message={errorMessage}
            onRetry={() => router.push("/login")}
            onListPath="/"
        />
    );
}