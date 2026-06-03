import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import AuthContext from "@/components/auth/AuthContext";
import React from "react";
import {getMessages} from "next-intl/server";
import {NextIntlClientProvider} from "next-intl";
import {ThemeProvider} from "@/components/common/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!),
  title: "TranslaCat",
  description: '언어의 벽을 넘는 가장 귀여운 방법',
  openGraph: {
    title: 'TranslaCat',
    description: '언어의 벽을 넘는 가장 귀여운 방법',
    type: 'website',
    images: ['/images/opengraph-image-groups.png'],
  },
};

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
          <AuthContext>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <main>{props.children}</main>
            </ThemeProvider>
          </AuthContext>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
