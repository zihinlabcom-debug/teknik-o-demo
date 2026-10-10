import type { Metadata, Viewport } from "next";
import type {ReactNode} from 'react';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TEKNİK-O",
  description: "Teknik Servis Çağrı ve Takip Platformu",
  applicationName: "TEKNİK-O",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TEKNİK-O",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: {children:ReactNode}) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
