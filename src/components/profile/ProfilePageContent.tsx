"use client";

import { useTranslations } from "next-intl";

import ProfileEditForm from "@/components/profile/ProfileEditForm";
import ProfileImageSettings from "@/components/profile/ProfileImageSettings";
import ProfileInfoCard from "@/components/profile/ProfileInfoCard";
import ProfilePageError from "@/components/profile/ProfilePageError";
import ProfilePageSkeleton from "@/components/profile/ProfilePageSkeleton";
import SettingsSubPageHeader from "@/components/settings/SettingsSubPageHeader";
import { useMyProfile } from "@/hooks/profile/useMyProfile";

export default function ProfilePageContent() {
    const t = useTranslations("Social.profilePage");

    const {
        profile,
        form,
        isLoading,
        isSaving,
        loadErrorCode,
        saveErrorCode,
        validationErrors,
        hasChanges,
        isSaved,
        reload,
        updateField,
        resetForm,
        saveProfile,
        applyImageProfileUpdate,
    } = useMyProfile();

    return (
        <main className="space-y-6 pt-24">
            <SettingsSubPageHeader
                eyebrow={t("eyebrow")}
                title={t("title")}
                description={t("description")}
            />

            {isLoading && <ProfilePageSkeleton />}

            {!isLoading && loadErrorCode && (
                <ProfilePageError
                    title={t("messages.loadFailedTitle")}
                    description={t(
                        "messages.loadFailedDescription",
                    )}
                    retryLabel={t("actions.reload")}
                    onRetry={reload}
                />
            )}

            {!isLoading && !loadErrorCode && profile && (
                <>
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                        <ProfileInfoCard profile={profile} />

                        <ProfileEditForm
                            form={form}
                            profile={profile}
                            isSaving={isSaving}
                            saveErrorCode={saveErrorCode}
                            validationErrors={validationErrors}
                            hasChanges={hasChanges}
                            isSaved={isSaved}
                            onChange={updateField}
                            onReset={resetForm}
                            onSave={saveProfile}
                        />
                    </div>

                    <ProfileImageSettings
                        profile={profile}
                        onProfileChange={applyImageProfileUpdate}
                    />
                </>
            )}
        </main>
    );
}
