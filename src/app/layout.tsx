import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal de Empleo | Municipalidad de Funes",
  description: "Encontrá tu próximo trabajo en el Portal Municipal de Empleo de Funes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
