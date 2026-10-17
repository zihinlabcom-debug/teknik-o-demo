import type { Metadata, Viewport } from "next";
import type {ReactNode} from 'react';
import {Manrope} from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HizmetPey Usta",
  description: "HizmetPey usta iş ve hizmet yönetimi",
  applicationName: "HizmetPey Usta",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HizmetPey Usta",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: {children:ReactNode}) {
  return (
    <html
      lang="tr"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
