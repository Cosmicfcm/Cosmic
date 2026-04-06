import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cosmic",
  description: "A calm AI calendar and productivity system for focused days.",
  manifest: "/manifest.webmanifest",
  applicationName: "Cosmic",
  keywords: [
    "calendar",
    "productivity",
    "ai assistant",
    "scheduler",
    "reminders",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
