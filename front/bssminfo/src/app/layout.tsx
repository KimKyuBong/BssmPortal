import type { Metadata } from "next";
import "./globals.css";

// Google 폰트 및 로컬 폰트 대신 CSS 변수만 정의
const fontClass = "font-sans";

export const metadata: Metadata = {
  title: "부산소프트웨어마이스터고 정보 포털",
  description: "부산소프트웨어마이스터고 정보 시스템",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo.png', type: 'image/png' }
    ],
    apple: '/logo.png',
    shortcut: '/logo.png'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${fontClass} antialiased`}>
        {children}
      </body>
    </html>
  );
}
