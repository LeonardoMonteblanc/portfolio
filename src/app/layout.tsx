import type { Metadata } from "next";
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
  title: "GuiaBG - Diretório Comunitário de Bento Gonçalves",
  description:
    "Encontre comércios, serviços e empresas locais em Bento Gonçalves. O guia comunitário para encontrar o que você precisa na Serra Gaúcha.",
  keywords: [
    "Bento Gonçalves",
    "diretório",
    "comércios",
    "serviços",
    "empresas locais",
    "Serra Gaúcha",
    "guia comercial",
  ],
  authors: [{ name: "GuiaBG" }],
  creator: "GuiaBG",
  publisher: "GuiaBG",
  robots: "index, follow",
  openGraph: {
    title: "GuiaBG - Diretório Comunitário de Bento Gonçalves",
    description:
      "Encontre comércios, serviços e empresas locais em Bento Gonçalves. O guia comunitário para encontrar o que você precisa na Serra Gaúcha.",
    type: "website",
    locale: "pt_BR",
    siteName: "GuiaBG",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
