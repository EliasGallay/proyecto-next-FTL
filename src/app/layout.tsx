import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Norte | Ingresar",
  description: "Acceso al espacio de trabajo Norte.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
