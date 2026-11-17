import type { Metadata, Viewport } from "next";
import "@fontsource-variable/source-sans-3";
import "./globals.css";
import { MockBanner } from "@/components/MockBanner";

export const metadata: Metadata = {
  title: "SLIIT Parking",
  description: "QR-based vehicle pass and parking fee system for SLIIT",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#e8ecff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="bg-mesh min-h-dvh flex flex-col">
        <MockBanner />
        {children}
      </body>
    </html>
  );
}
