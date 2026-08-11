import BottomNav from "@/components/common/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "BNOTE",
  description:
    "성경 읽기 + 설교노트 + 암송 + 기도제목을 아우르는 개인 신앙 기록 웹 앱",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BNOTE",
  },
};

export const viewport: Viewport = {
  themeColor: "#795548",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${roboto.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <div className="flex flex-1 flex-col pb-[52px]">{children}</div>
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
