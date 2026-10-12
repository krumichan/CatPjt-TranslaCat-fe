import { Suspense } from "react";

import AccountAuthenticationSettings from "@/components/auth/AccountAuthenticationSettings";
import FullPageLoader from "@/components/common/FullPageLoader";

export default function AccountSettingsPage() {
    return <Suspense fallback={<FullPageLoader />}><AccountAuthenticationSettings /></Suspense>;
}
