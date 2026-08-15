"use client";

import { AdminLanguageLearningSettingsForm } from "@/components/language-learning/admin/AdminLanguageLearningSettingsForm";
import { useAdminLanguageLearningSettingForm } from "@/hooks/language-learning/useAdminLanguageLearningSettingForm";

export function AdminLanguageLearningSettingsSmartForm() {
    const controller = useAdminLanguageLearningSettingForm();
    return <AdminLanguageLearningSettingsForm controller={controller} />;
}
