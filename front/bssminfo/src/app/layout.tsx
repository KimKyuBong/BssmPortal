import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Google 폰트 및 로컬 폰트 대신 CSS 변수만 정의
const fontClass = "font-sans";

export const metadata: Metadata = {
  title: "부산소프트웨어마이스터고 정보 포털",
  description: "부산소프트웨어마이스터고 정보 시스템",
  icons: {
    icon: '/favicon.ico',
    apple: '/logo.png',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
