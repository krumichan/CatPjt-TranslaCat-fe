"use client";

import { useTranslations } from "next-intl";

import { AuthPageFrame } from "@/components/auth/AuthFormParts";
import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage() {
    const t = useTranslations("Auth");
    return <AuthPageFrame title={t("registerTitle")} description={t("registerDescription")}><RegisterForm /></AuthPageFrame>;
}
