import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sebams — Tus tareas en ChatGPT",
  description: "Conector privado de tareas de Sebams para ChatGPT.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
