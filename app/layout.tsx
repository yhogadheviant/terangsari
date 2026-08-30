import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal Digital Terangsari 1",
  description: "Portal Digital Warga Terangsari 1"
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="id"><body>{children}</body></html>;
}



