import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/500.css";
import "@fontsource/noto-sans-jp/700.css";
import "../globals.css";

import { ThemeProvider } from "@/components/common/ThemeProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!),
    title: "TranslaCat user guide",
    description: "Learn to use TranslaCat, one task at a time.",
};

export default function EnglishGuideRootLayout({ children }: { children: ReactNode }) {
    // 기존 영어 가이드의 독립 루트와 테마를 유지한다. 앱의 영어 화면은 [locale] 레이아웃을 사용한다.
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <main>{children}</main>
                </ThemeProvider>
            </body>
        </html>
    );
}
