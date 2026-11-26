"use client";

import { Suspense } from "react";

import LoginContent from "@/components/auth/LoginContent";
import FullPageLoader from "@/components/common/FullPageLoader";

/** 로그인 프록시의 복귀 주소는 클라이언트에서 읽는다. */
export default function LoginPage() {
    return <Suspense fallback={<FullPageLoader />}><LoginContent /></Suspense>;
}
