export const metadata = {
  title: "Connected",
  description: "Micro-learning + rolling brief"
};

 import type { ReactNode } from "react";

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
