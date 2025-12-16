export const metadata = {
  title: "Connected",
  description: "Micro-learning + rolling brief"
};

import type { ReactNode } from "react";
import { Inter } from "next/font/google";

import "./globals.css";
import { PageTransitionProvider } from "../src/components/PageTransitionProvider";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <body suppressHydrationWarning className={`${inter.className} min-h-screen bg-bg text-text antialiased`}>
        <PageTransitionProvider>
          {children}
        </PageTransitionProvider>
      </body>
    </html>
  );
}
