export const metadata = {
  title: "Connected",
  description: "Micro-learning + rolling brief"
};

 import type { ReactNode } from "react";
 import { Inter } from "next/font/google";
 
 import "./globals.css";

 const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-bg text-text antialiased`}>{children}</body>
    </html>
  );
}
