import type { ReactNode } from "react";

import GuideLayout from "@/components/docs/GuideLayout";
import "../../[locale]/(guides)/docs/guides.css";

export default function EnglishGuideLayout({ children }: { children: ReactNode }) {
    return <GuideLayout params={Promise.resolve({ locale: "en" })}>{children}</GuideLayout>;
}
